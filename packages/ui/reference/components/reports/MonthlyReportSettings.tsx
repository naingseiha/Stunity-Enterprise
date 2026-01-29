"use client";

import { ChevronDown, ChevronUp, Calendar, Edit3 } from "lucide-react";
import { formatReportDate } from "@/lib/khmerDateUtils";
import { useEffect } from "react";

interface MonthlyReportSettingsProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  province: string;
  setProvince: (value: string) => void;
  examCenter: string;
  setExamCenter: (value: string) => void;
  schoolName: string;
  setSchoolName: (value: string) => void;
  roomNumber: string;
  setRoomNumber: (value: string) => void;
  reportTitle: string;
  setReportTitle: (value: string) => void;
  examSession: string;
  setExamSession: (value: string) => void;
  reportDate: string;
  setReportDate: (value: string) => void;
  teacherName: string;
  setTeacherName: (value: string) => void;
  principalName: string;
  setPrincipalName: (value: string) => void;
  showCircles: boolean;
  setShowCircles: (value: boolean) => void;
  autoCircle: boolean;
  setAutoCircle: (value: boolean) => void;
  showDateOfBirth: boolean;
  setShowDateOfBirth: (value: boolean) => void;
  showGrade: boolean;
  setShowGrade: (value: boolean) => void;
  showOther: boolean;
  setShowOther: (value: boolean) => void;
  showSubjects?: boolean;
  setShowSubjects?: (value: boolean) => void;
  showAttendance?: boolean;
  setShowAttendance?: (value: boolean) => void;
  showTotal?: boolean;
  setShowTotal?: (value: boolean) => void;
  showAverage?: boolean;
  setShowAverage?: (value: boolean) => void;
  showGradeLevel?: boolean;
  setShowGradeLevel?: (value: boolean) => void;
  showRank?: boolean;
  setShowRank?: (value: boolean) => void;
  showRoomNumber?: boolean;
  setShowRoomNumber?: (value: boolean) => void;
  showClassName?: boolean;
  setShowClassName?: (value: boolean) => void;
  firstPageStudentCount?: number;
  setFirstPageStudentCount?: (value: number) => void;
  secondPageStudentCount?: number;
  setSecondPageStudentCount?: (value: number) => void;
  tableFontSize?: number;
  setTableFontSize?: (value: number) => void;
  useAutoDate?: boolean;
  setUseAutoDate?: (value: boolean) => void;
  reportFormat?: string;
}

export default function MonthlyReportSettings({
  showSettings,
  setShowSettings,
  province,
  setProvince,
  examCenter,
  setExamCenter,
  schoolName,
  setSchoolName,
  roomNumber,
  setRoomNumber,
  reportTitle,
  setReportTitle,
  examSession,
  setExamSession,
  reportDate,
  setReportDate,
  teacherName,
  setTeacherName,
  principalName,
  setPrincipalName,
  showCircles,
  setShowCircles,
  autoCircle,
  setAutoCircle,
  showDateOfBirth,
  setShowDateOfBirth,
  showGrade,
  setShowGrade,
  showOther,
  setShowOther,
  showSubjects = false,
  setShowSubjects = () => {},
  showAttendance = true,
  setShowAttendance = () => {},
  showTotal = true,
  setShowTotal = () => {},
  showAverage = true,
  setShowAverage = () => {},
  showGradeLevel = true,
  setShowGradeLevel = () => {},
  showRank = true,
  setShowRank = () => {},
  showRoomNumber = true,
  setShowRoomNumber = () => {},
  showClassName = true,
  setShowClassName = () => {},
  firstPageStudentCount = 20,
  setFirstPageStudentCount = () => {},
  secondPageStudentCount = 35,
  setSecondPageStudentCount = () => {},
  tableFontSize = 10,
  setTableFontSize = () => {},
  useAutoDate = true,
  setUseAutoDate = () => {},
  reportFormat = "summary",
}: MonthlyReportSettingsProps) {
  // Auto-update date when useAutoDate or schoolName changes
  useEffect(() => {
    if (useAutoDate) {
      setReportDate(formatReportDate(schoolName));
    }
  }, [useAutoDate, schoolName, setReportDate]);

  // Generate today's date in Khmer format
  const handleGenerateDate = () => {
    setReportDate(formatReportDate(schoolName));
  };

  return (
    <div className="border-t pt-4">
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-indigo-600 transition-colors"
      >
        {showSettings ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
        កំណត់សេវាកម្ម Report Settings
      </button>

      {showSettings && (
        <div className="mt-4 space-y-6">
          {/* General Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                មន្ទីរ/ខេត្ត Province
              </label>
              <input
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="មន្ទីរអប់រំយុវជន និងកីឡា ខេត្តសៀមរាប"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ឈ្មោះសាលា School Name (Full)
              </label>
              <input
                type="text"
                value={examCenter}
                onChange={(e) => setExamCenter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="វិទ្យាល័យ ហ៊ុន សែនស្វាយធំ"
              />
            </div>

            {/* School Name for Date Footer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ឈ្មោះសាលា (សម្រាប់កាលបរិច្ឆេទ) School Name (for Date)
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="ស្វាយធំ"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                បន្ទប់ប្រឡង Room Number
              </label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="01"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ចំណងជើង Title
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="តារាងលទ្ធផលប្រចាំខែ"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                វគ្គប្រឡង Session
              </label>
              <input
                type="text"
                value={examSession}
                onChange={(e) => setExamSession(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="សប្តាហ៍ទី ១២៖ ខែធ្នូ ២០២៤-២០២៥"
              />
            </div>

            {/* Enhanced Date Input with Auto-Generate */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                កាលបរិច្ឆេទ Date
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reportDate}
                  onChange={(e) => {
                    setReportDate(e.target.value);
                    if (setUseAutoDate) setUseAutoDate(false);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  placeholder="ស្វាយធំ ថ្ងៃទី០៨ ខែធ្នូ ឆ្នាំ២០២៥"
                />
                <button
                  onClick={handleGenerateDate}
                  className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold"
                  title="បង្កើតកាលបរិច្ឆេទថ្ងៃនេះ"
                >
                  <Calendar className="w-4 h-4" />
                  ថ្ងៃនេះ
                </button>
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAutoDate}
                  onChange={(e) => {
                    if (setUseAutoDate) {
                      setUseAutoDate(e.target.checked);
                      if (e.target.checked) {
                        setReportDate(formatReportDate(schoolName));
                      }
                    }
                  }}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-xs text-gray-600">
                  ធ្វើបច្ចុប្បន្នភាពស្វ័យប្រវត្តិ Auto-update to current date
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                គ្រូបន្ទុក Teacher
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="គ្រូបន្ទុកថ្នាក់"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                នាយក Principal
              </label>
              <input
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="នាយកសាលា"
              />
            </div>
          </div>

          {/* Layout Settings */}
          <div className="p-4 bg-purple-50 rounded-lg">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              ការកំណត់ Layout Settings
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Font Size Control */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ទំហំអក្សរក្នុងតារាង Table Font Size: {tableFontSize}px
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="7"
                    max="14"
                    step="1"
                    value={tableFontSize}
                    onChange={(e) => setTableFontSize(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <input
                    type="number"
                    min="7"
                    max="14"
                    value={tableFontSize}
                    onChange={(e) =>
                      setTableFontSize(parseInt(e.target.value) || 10)
                    }
                    className="w-16 px-2 py-1 text-center border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>តូច (7px)</span>
                  <span>មធ្យម (10px)</span>
                  <span>ធំ (14px)</span>
                </div>
              </div>

              {/* First Page Student Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ចំនួនសិស្សទំព័រដំបូង First Page: {firstPageStudentCount}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={reportFormat === "detailed" ? "25" : "15"}
                    max={reportFormat === "detailed" ? "40" : "30"}
                    step="1"
                    value={firstPageStudentCount}
                    onChange={(e) =>
                      setFirstPageStudentCount(parseInt(e.target.value))
                    }
                    className="flex-1 h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <input
                    type="number"
                    min={reportFormat === "detailed" ? "25" : "15"}
                    max={reportFormat === "detailed" ? "40" : "30"}
                    value={firstPageStudentCount}
                    onChange={(e) =>
                      setFirstPageStudentCount(parseInt(e.target.value) || 20)
                    }
                    className="w-16 px-2 py-1 text-center border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>តិច ({reportFormat === "detailed" ? "25" : "15"})</span>
                  <span>
                    មធ្យម ({reportFormat === "detailed" ? "32" : "20"})
                  </span>
                  <span>
                    ច្រើន ({reportFormat === "detailed" ? "40" : "30"})
                  </span>
                </div>
              </div>

              {/* ✅ Second Page Student Count - For BOTH formats */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ចំនួនសិស្សទំព័រទី២ Second Page: {secondPageStudentCount}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={reportFormat === "detailed" ? "30" : "20"}
                    max={reportFormat === "detailed" ? "50" : "40"}
                    step="1"
                    value={secondPageStudentCount}
                    onChange={(e) =>
                      setSecondPageStudentCount(parseInt(e.target.value))
                    }
                    className="flex-1 h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <input
                    type="number"
                    min={reportFormat === "detailed" ? "30" : "20"}
                    max={reportFormat === "detailed" ? "50" : "40"}
                    value={secondPageStudentCount}
                    onChange={(e) =>
                      setSecondPageStudentCount(parseInt(e.target.value) || 40)
                    }
                    className="w-16 px-2 py-1 text-center border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  {reportFormat === "detailed" ? (
                    <>
                      <span>តិច (30)</span>
                      <span>មធ្យម (40)</span>
                      <span>ច្រើន (50)</span>
                    </>
                  ) : (
                    <>
                      <span>តិច (20)</span>
                      <span>មធ្យម (30)</span>
                      <span>ច្រើន (40)</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Info Message */}
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800 mb-1">
                💡 <strong>ជំនួយ:</strong>{" "}
                {reportFormat === "detailed"
                  ? "របាយការណ៍លម្អិតមុខវិជ្ជា៖ ទំព័រដំបូងមាន header និង footer ត្រូវការសិស្សសន្ធឹម ២៥-៣២ នាក់។ ទំព័រទី២បន្ទាប់ៗ (គ្មាន header) អាចដាក់បាន ៣០-៥០ នាក់។"
                  : "របាយការណ៍សង្ខេប៖ ទំព័រដំបូងមាន header ធំ។ ទំព័របន្ទាប់ៗមិនមាន header អាចដាក់សិស្សបានច្រើនជាង។"}
              </p>
              <p className="text-xs text-blue-700">
                📄 <strong>A4 Printing:</strong> ទំព័រ A4 (297mm) -
                Header(~60mm) - Footer(~40mm) - Margins(20mm) = ~177mm សម្រាប់តារាង។
                ជួរនីមួយៗ = 5.5mm → អតិបរមា ~{reportFormat === "detailed" ? "32" : "28"} នាក់ (ទំព័រដំបូង) និង ~{reportFormat === "detailed" ? "45" : "38"} នាក់ (ទំព័របន្ទាប់)
              </p>
            </div>
          </div>

          {/* Column Visibility Settings */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              បង្ហាញ/លាក់ជួរឈរ Show/Hide Columns
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {reportFormat === "summary" && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSubjects}
                    onChange={(e) => setShowSubjects(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">បង្ហាញមុខវិជ្ជា</span>
                </label>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAttendance}
                  onChange={(e) => setShowAttendance(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">អវត្តមាន</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTotal}
                  onChange={(e) => setShowTotal(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">ពិន្ទុសរុប</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAverage}
                  onChange={(e) => setShowAverage(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">មធ្យមភាគ</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRank}
                  onChange={(e) => setShowRank(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">ចំណាត់ថ្នាក់</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGradeLevel}
                  onChange={(e) => setShowGradeLevel(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">និទ្ទេស</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRoomNumber}
                  onChange={(e) => setShowRoomNumber(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">បន្ទប់ប្រឡង</span>
              </label>

              {setShowClassName !== (() => {}) && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showClassName}
                    onChange={(e) => setShowClassName(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">បង្ហាញថ្នាក់</span>
                </label>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCircles}
                  onChange={(e) => setShowCircles(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">រង្វង់ខ្ពស់</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCircle}
                  onChange={(e) => setAutoCircle(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">រង្វង់ស្វ័យ</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
