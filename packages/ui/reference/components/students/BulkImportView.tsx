"use client";

import { useState } from "react";
import BulkStudentGrid from "./BulkStudentGrid";
import { StudentRowData } from "./StudentGridRow";
import { studentsApi, BulkStudentData } from "@/lib/api/students";
import { Download, Users, CheckCircle } from "lucide-react";

interface BulkImportViewProps {
  classes: any[];
  onSuccess: () => void;
}

export default function BulkImportView({
  classes,
  onSuccess,
}: BulkImportViewProps) {
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [importResult, setImportResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    const cls = classes.find((c) => c.id === classId);
    if (cls) {
      setSelectedGrade(cls.grade);
    }
  };

  const handleSave = async (students: StudentRowData[]) => {
    try {
      const bulkData: BulkStudentData[] = students.map((row) => ({
        name: row.name,
        gender: row.gender,
        dateOfBirth: row.dateOfBirth,
        previousGrade: row.previousGrade,
        previousSchool: row.previousSchool,
        repeatingGrade: row.repeatingGrade,
        transferredFrom: row.transferredFrom,
        remarks: row.remarks,
        grade9ExamSession: row.grade9ExamSession,
        grade9ExamCenter: row.grade9ExamCenter,
        grade9ExamRoom: row.grade9ExamRoom,
        grade9ExamDesk: row.grade9ExamDesk,
        grade12ExamSession: row.grade12ExamSession,
        grade12ExamCenter: row.grade12ExamCenter,
        grade12ExamRoom: row.grade12ExamRoom,
        grade12ExamDesk: row.grade12ExamDesk,
        grade12Track: row.grade12Track,
      }));

      const result = await studentsApi.bulkCreate(selectedClassId, bulkData);
      const resultData = result.data || result;

      setImportResult(resultData);
      setShowResult(true);
    } catch (error: any) {
      console.error("❌ Bulk import failed:", error);
      throw error;
    }
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setImportResult(null);
    onSuccess();
  };

  const downloadTemplate = () => {
    const gradeNum = parseInt(selectedGrade);
    let headers = [
      "ល. រ",
      "គោត្តនាម-នាម",
      "ភេទ",
      "ថ្ងៃខែឆ្នាំកំណើត",
      "ឡើងពីថ្នាក់",
      "មកពីសាលា",
      "ត្រួតថ្នាក់ទី",
      "ផ្ទេរមកពី",
    ];

    if (gradeNum >= 9) {
      headers.push("សម័យប្រឡងទី៩", "មណ្ឌលប្រឡង", "បន្ទប់", "លេខតុ");
    }

    if (gradeNum >= 12) {
      headers.push("សម័យប្រឡងទី១២", "មណ្ឌលប្រឡង", "បន្ទប់", "លេខតុ", "ផ្លូវ");
    }

    headers.push("ផ្សេងៗ");

    let sampleRow = ["1", "សុខ ដារ៉ា", "ប", "7/5/12", "៦ក", "សាលាចាស់", "", ""];

    if (gradeNum >= 9) {
      sampleRow.push("២០២៤", "មណ្ឌល១", "១", "០១");
    }

    if (gradeNum >= 12) {
      sampleRow.push("២០២៧", "មណ្ឌល១", "១", "០១", "វិទ្យាសាស្ត្រ");
    }

    sampleRow.push("សិស្សពូកែ");

    const csvContent = headers.join(",") + "\n" + sampleRow.join(",") + "\n";
    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `template_grade_${selectedGrade}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 w-full max-w-full">
      {/* ✅ Clean Instructions Card - No heavy shadow */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">ℹ️</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-blue-900 mb-2">
              📋 របៀបប្រើប្រាស់
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs text-blue-800">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                  1
                </span>
                <span>ជ្រើសរើសថ្នាក់រៀន</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                  2
                </span>
                <span>ទាញយក Template (ប្រសិនបើត្រូវការ)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                  3
                </span>
                <span>Copy ទិន្នន័យពី Excel (Ctrl+C)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                  4
                </span>
                <span>Paste ទៅក្នុង Grid (Ctrl+V)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                  5
                </span>
                <span>ពិនិត្យទិន្នន័យ (បំពេញ fields ដែលមាន *)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                  6
                </span>
                <span>ចុច "Save All" ដើម្បីរក្សាទុក</span>
              </div>
            </div>
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs text-yellow-800 font-semibold">
                ⚠️ <strong>សម្គាល់:</strong> ទ្រង់ទ្រាយកាលបរិច្ឆេទគឺ DD/MM/YY
                (ឧទាហរណ៍: 7/5/12, 20/2/13)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Redesigned Class Selection - Clean & Aligned */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-bold text-gray-700 mb-3">
          ជ្រើសរើសថ្នាក់ *
        </label>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Class Selector - Takes more space */}
          <div className="lg:col-span-5">
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full h-12 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">-- ជ្រើសរើសថ្នាក់ --</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} (Grade {cls.grade})
                </option>
              ))}
            </select>
          </div>

          {/* Class Info Card - Same height */}
          {selectedClass && (
            <div className="lg:col-span-4">
              <div className="h-12 bg-blue-50 border border-blue-200 rounded-lg px-4 flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-blue-600 font-semibold truncate">
                    {selectedClass.name}
                  </div>
                  <div className="text-[10px] text-blue-700 truncate">
                    កម្រិត {selectedClass.grade} • ផ្នែក{" "}
                    {selectedClass.section || "N/A"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Download Template Button - Same height */}
          {selectedClass && (
            <div className="lg:col-span-3">
              <button
                onClick={downloadTemplate}
                className="w-full h-12 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">ទាញយក Template</span>
                <span className="sm:hidden">Template</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      {selectedClassId && selectedGrade ? (
        <BulkStudentGrid
          classId={selectedClassId}
          grade={selectedGrade}
          onSave={handleSave}
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-16 text-center">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4">📤</div>
            <h3 className="text-xl font-koulen text-gray-900 mb-2">
              សូមជ្រើសរើសថ្នាក់
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              ដើម្បីចាប់ផ្តើមបញ្ចូលទិន្នន័យសិស្សជាបណ្តុំ
              សូមជ្រើសរើសថ្នាក់ពីខាងលើ
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <span>📊</span>
              <span>គាំទ្រទម្រង់ Excel និង CSV</span>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Clean Success Modal - Minimal shadow */}
      {showResult && importResult && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-gray-200 max-w-3xl w-full max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="bg-green-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-koulen">
                    បញ្ចូលទិន្នន័យបានជោគជ័យ!{" "}
                  </h2>
                  <p className="text-sm text-green-100 mt-1">
                    Import completed successfully
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-center">
                  <div className="text-3xl font-moul text-blue-600 mb-1">
                    {importResult.total}
                  </div>
                  <div className="text-xs text-blue-800 font-bold uppercase">
                    សរុបទាំងអស់
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
                  <div className="text-3xl font-moul text-green-600 mb-1">
                    {importResult.success}
                  </div>
                  <div className="text-xs text-green-800 font-bold uppercase">
                    ជោគជ័យ
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-center">
                  <div className="text-3xl font-moul text-red-600 mb-1">
                    {importResult.failed}
                  </div>
                  <div className="text-xs text-red-800 font-bold uppercase">
                    បរាជ័យ
                  </div>
                </div>
              </div>

              {/* Success List */}
              {importResult.results.success.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl font-koulen">✅</span>
                    <h3 className="text-sm font-bold text-green-700">
                      បញ្ជីសិស្សដែលបានបង្កើតជោគជ័យ (
                      {importResult.results.success.length})
                    </h3>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {importResult.results.success.map((item: any) => (
                        <div
                          key={item.row}
                          className="flex items-center justify-between bg-white border border-green-200 p-2 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-green-100 text-green-700 rounded flex items-center justify-center text-xs font-bold">
                              {item.row}
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {item.name}
                            </span>
                          </div>
                          <span className="text-xs text-green-700 font-mono font-bold bg-green-100 px-2 py-1 rounded">
                            {item.studentId}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Failed List */}
              {importResult.results.failed.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl font-koulen">❌</span>
                    <h3 className="text-sm font-bold text-red-700">
                      បញ្ជីសិស្សដែលបរាជ័យ ({importResult.results.failed.length})
                    </h3>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {importResult.results.failed.map((item: any) => (
                        <div
                          key={item.row}
                          className="bg-white border border-red-200 p-3 rounded"
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 bg-red-100 text-red-700 rounded flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {item.row}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-gray-900 mb-1">
                                {item.name}
                              </div>
                              <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded inline-block">
                                {item.error}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-end">
              <button
                onClick={handleCloseResult}
                className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors"
              >
                បិទ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
