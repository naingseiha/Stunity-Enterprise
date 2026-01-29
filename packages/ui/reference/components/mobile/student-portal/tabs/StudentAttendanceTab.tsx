"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  RefreshCw,
  Loader2,
  CheckCircle,
  X,
  AlertCircle,
  Clock,
  CalendarCheck,
} from "lucide-react";
import { AttendanceResponse, getMyAttendance } from "@/lib/api/student-portal";

const MONTHS = [
  { value: "មករា", label: "មករា", number: 1 },
  { value: "កុម្ភៈ", label: "កុម្ភៈ", number: 2 },
  { value: "មីនា", label: "មីនា", number: 3 },
  { value: "មេសា", label: "មេសា", number: 4 },
  { value: "ឧសភា", label: "ឧសភា", number: 5 },
  { value: "មិថុនា", label: "មិថុនា", number: 6 },
  { value: "កក្កដា", label: "កក្កដា", number: 7 },
  { value: "សីហា", label: "សីហា", number: 8 },
  { value: "កញ្ញា", label: "កញ្ញា", number: 9 },
  { value: "តុលា", label: "តុលា", number: 10 },
  { value: "វិច្ឆិកា", label: "វិច្ឆិកា", number: 11 },
  { value: "ធ្នូ", label: "ធ្នូ", number: 12 },
];

interface StudentAttendanceTabProps {
  initialAttendanceData: AttendanceResponse | null;
  currentYear: number;
  currentMonth: string;
}

export default function StudentAttendanceTab({
  initialAttendanceData,
  currentYear,
  currentMonth,
}: StudentAttendanceTabProps) {
  const [attendanceData, setAttendanceData] = useState<AttendanceResponse | null>(
    initialAttendanceData
  );
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [dataLoading, setDataLoading] = useState(false);

  const loadAttendance = async () => {
    try {
      setDataLoading(true);
      setAttendanceData(null); // Clear old data to show loading
      const monthNumber = MONTHS.find((m) => m.value === selectedMonth)?.number || 1;
      const data = await getMyAttendance({
        month: monthNumber,
        year: selectedYear,
      });
      setAttendanceData(data);
    } catch (error) {
      console.error("Error loading attendance:", error);
    } finally {
      setDataLoading(false);
    }
  };

  // Removed auto-load on filter change - user must click load button

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "PRESENT":
        return {
          label: "ឡើង",
          bg: "bg-green-50",
          border: "border-green-200",
          textColor: "text-green-700",
          iconBg: "bg-green-100",
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
        };
      case "ABSENT":
        return {
          label: "អវត្តមាន",
          bg: "bg-red-50",
          border: "border-red-200",
          textColor: "text-red-700",
          iconBg: "bg-red-100",
          icon: <X className="w-5 h-5 text-red-600" />,
        };
      case "PERMISSION":
        return {
          label: "ច្បាប់",
          bg: "bg-blue-50",
          border: "border-blue-200",
          textColor: "text-blue-700",
          iconBg: "bg-blue-100",
          icon: <AlertCircle className="w-5 h-5 text-blue-600" />,
        };
      case "LATE":
        return {
          label: "យឺត",
          bg: "bg-orange-50",
          border: "border-orange-200",
          textColor: "text-orange-700",
          iconBg: "bg-orange-100",
          icon: <Clock className="w-5 h-5 text-orange-600" />,
        };
      default:
        return {
          label: "មិនស្គាល់",
          bg: "bg-gray-50",
          border: "border-gray-200",
          textColor: "text-gray-700",
          iconBg: "bg-gray-100",
          icon: <AlertCircle className="w-5 h-5 text-gray-600" />,
        };
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ការចូលរៀន</h1>
        <button
          onClick={loadAttendance}
          disabled={dataLoading}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw
            className={`w-5 h-5 text-gray-600 ${dataLoading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">ឆ្នាំសិក្សា</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:outline-none text-sm"
            >
              <option value={2024}>2024-2025</option>
              <option value={2025}>2025-2026</option>
              <option value={2026}>2026-2027</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">ខែ</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:outline-none text-sm"
            >
              {MONTHS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Load Button - Always show when not loading */}
      {!dataLoading && (
        <button
          onClick={loadAttendance}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl shadow-lg p-5 hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          <Calendar className="w-6 h-6" />
          <span className="font-bold text-lg">
            {attendanceData ? "ផ្ទុកទិន្នន័យឡើងវិញ" : "ផ្ទុកទិន្នន័យការចូលរៀន"}
          </span>
        </button>
      )}

      {/* Loading State */}
      {dataLoading && (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">កំពុងផ្ទុកទិន្នន័យ...</p>
        </div>
      )}

      {attendanceData && !dataLoading ? (
        <div className="space-y-4 relative">

          {/* Enhanced Statistics Summary */}
          <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 rounded-3xl shadow-xl p-6 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-white bg-opacity-20 p-2 rounded-xl">
                  <CalendarCheck className="w-5 h-5 text-white" />
                </div>
                <h1 className="font-bold text-lg">ស្ថិតិការចូលរៀន</h1>
              </div>

              {/* Stats Grid - 4 columns */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-2xl p-3 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-green-100 mb-1">ឡើង</p>
                  <p className="text-xl font-bold">
                    {attendanceData.statistics?.presentCount || 0}
                  </p>
                </div>
                <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-2xl p-3 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <X className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-green-100 mb-1">អត់ច្បាប់</p>
                  <p className="text-xl font-bold">
                    {attendanceData.statistics?.absentCount || 0}
                  </p>
                </div>
                <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-2xl p-3 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-green-100 mb-1">ច្បាប់</p>
                  <p className="text-xl font-bold">
                    {attendanceData.statistics?.permissionCount || 0}
                  </p>
                </div>
                <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-2xl p-3 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Clock className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-green-100 mb-1">យឺត</p>
                  <p className="text-xl font-bold">
                    {attendanceData.statistics?.lateCount || 0}
                  </p>
                </div>
              </div>

              {/* Attendance Rate Progress Bar */}
              <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-green-100">អត្រាវត្តមាន</span>
                  <span className="text-lg font-bold">
                    {attendanceData.statistics?.attendanceRate?.toFixed(1) || "0"}%
                  </span>
                </div>
                <div className="w-full bg-white bg-opacity-20 rounded-full h-3">
                  <div
                    className="bg-white h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${attendanceData.statistics?.attendanceRate || 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Records */}
          {attendanceData.records && attendanceData.records.length > 0 ? (
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-3 px-1">
                កំណត់ត្រា ({attendanceData.records.length})
              </h2>
              <div className="space-y-3">
                {attendanceData.records.map((record) => {
                  const config = getStatusConfig(record.status);
                  const date = new Date(record.date);
                  const dateStr = date.toLocaleDateString("km-KH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  });
                  const dayOfWeek = date.toLocaleDateString("km-KH", {
                    weekday: "long",
                  });

                  return (
                    <div
                      key={record.id}
                      className={`${config.bg} rounded-2xl shadow-sm border-2 ${config.border} overflow-hidden`}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Status Icon */}
                          <div className={`${config.iconBg} p-2 rounded-xl shrink-0`}>
                            {config.icon}
                          </div>

                          {/* Main Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1">
                                <p
                                  className={`font-bold ${config.textColor} text-base leading-tight`}
                                >
                                  {dateStr}
                                </p>
                                <p className="text-xs text-gray-600 mt-0.5">{dayOfWeek}</p>
                              </div>
                              <div
                                className={`${config.iconBg} bg-opacity-10 px-3 py-1 rounded-lg`}
                              >
                                <span className={`text-xs font-bold ${config.textColor}`}>
                                  {config.label}
                                </span>
                              </div>
                            </div>

                            {/* Session Info */}
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  {record.session === "MORNING" ? "វេលាព្រឹក" : "វេលាល្ងាច"}
                                </span>
                              </div>
                            </div>

                            {/* Remarks if any */}
                            {record.remarks && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-xs text-gray-700 italic">
                                  <span className="font-semibold">សម្គាល់:</span>{" "}
                                  {record.remarks}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
