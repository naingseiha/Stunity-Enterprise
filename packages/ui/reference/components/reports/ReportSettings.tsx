"use client";

import { Settings, Eye, Camera, Award } from "lucide-react";

interface ReportSettingsProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  honorSchoolName: string;
  setHonorSchoolName: (name: string) => void;
  honorPeriod: string;
  setHonorPeriod: (period: string) => void;
  maxHonorStudents: number;
  setMaxHonorStudents: (max: number) => void;
  reportDate: string;
  setReportDate: (date: string) => void;
  teacherName: string;
  setTeacherName: (name: string) => void;
  principalName: string;
  setPrincipalName: (name: string) => void;
  showBorder: boolean;
  setShowBorder: (show: boolean) => void;
  showStudentPhotos: boolean;
  setShowStudentPhotos: (show: boolean) => void;
  pageMargin: string;
  setPageMargin: (margin: string) => void;
}

export default function ReportSettings({
  showSettings,
  setShowSettings,
  honorSchoolName,
  setHonorSchoolName,
  honorPeriod,
  setHonorPeriod,
  maxHonorStudents,
  setMaxHonorStudents,
  reportDate,
  setReportDate,
  teacherName,
  setTeacherName,
  principalName,
  setPrincipalName,
  showBorder,
  setShowBorder,
  showStudentPhotos,
  setShowStudentPhotos,
  pageMargin,
  setPageMargin,
}: ReportSettingsProps) {
  return (
    <div className="mt-4 space-y-4">
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 rounded-lg transition-colors"
      >
        <Settings className="w-5 h-5 text-purple-700" />
        <span className="text-sm font-semibold text-purple-700">
          កំណត់ការបង្ហាញតារាងកិត្តិយស
        </span>
      </button>
      {showSettings && (
        <div className="mt-4 p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 space-y-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-bold text-purple-800 mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              ព័ត៌មានតារាងកិត្តិយស Honor Certificate Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">
                  ឈ្មោះសាលា School Name
                </label>
                <input
                  type="text"
                  value={honorSchoolName}
                  onChange={(e) => setHonorSchoolName(e.target.value)}
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="សាលារៀនអន្តរជាតិ"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">
                  រយៈពេល Period
                </label>
                <input
                  type="text"
                  value={honorPeriod}
                  onChange={(e) => setHonorPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="ប្រចាំខែ មករា"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">
                  ចំនួនសិស្ស Max Students (5-6)
                </label>
                <input
                  type="number"
                  min="5"
                  max="6"
                  value={maxHonorStudents}
                  onChange={(e) =>
                    setMaxHonorStudents(parseInt(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">
                  កាលបរិច្ឆេទ Date
                </label>
                <input
                  type="text"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="ថ្ងៃទី..... ខែ..... ឆ្នាំ២០២៥"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">
                  ឈ្មោះគ្រូបន្ទុក Teacher
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">
                  ឈ្មោះនាយកសាលា Principal
                </label>
                <input
                  type="text"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-bold text-purple-800 mb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-600" />
              ជម្រើសស៊ុម, Margin & រូបថត Options
            </h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={showBorder}
                  onChange={(e) => setShowBorder(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded"
                />
                <span className="text-sm font-semibold text-gray-700">
                  បង្ហាញស៊ុម Show Border
                </span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={showStudentPhotos}
                  onChange={(e) => setShowStudentPhotos(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded"
                />
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  បង្ហាញរូបថតសិស្ស Show Student Photos
                </span>
              </label>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">
                  Margin (Padding) - អនុសាសន៍ 1.5cm
                </label>
                <select
                  value={pageMargin}
                  onChange={(e) => setPageMargin(e.target.value)}
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="0.5cm">0.5cm</option>
                  <option value="1cm">1.0cm</option>
                  <option value="1.5cm">1.5cm (អនុសាសន៍)</option>
                  <option value="2cm">2.0cm</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
