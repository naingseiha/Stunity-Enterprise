"use client";

import { useState, useEffect } from "react";
import BulkTeacherGrid from "./BulkTeacherGrid";
import { teachersApi, BulkTeacherData } from "@/lib/api/teachers";
import { CheckCircle, Loader2, X } from "lucide-react";

interface BulkImportViewProps {
  subjects: any[];
  onSuccess: () => void;
}

export default function BulkImportView({
  subjects,
  onSuccess,
}: BulkImportViewProps) {
  const [importing, setImporting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [existingTeachers, setExistingTeachers] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  // ✅ Load existing teachers on mount
  useEffect(() => {
    loadExistingTeachers();
  }, []);

  const loadExistingTeachers = async () => {
    setLoadingExisting(true);
    try {
      console.log("⚡ Loading existing teachers (lightweight)...");
      const response = await teachersApi.getAllLightweight();
      const teachers = response.success && Array.isArray(response.data) ? response.data : [];
      console.log(`⚡ Loaded ${teachers.length} existing teachers (fast)`);
      setExistingTeachers(teachers);
    } catch (error) {
      console.error("❌ Failed to load existing teachers:", error);
      setExistingTeachers([]);
    } finally {
      setLoadingExisting(false);
    }
  };

  const handleSave = async (teachers: BulkTeacherData[]) => {
    setImporting(true);

    try {
      console.log("📤 Sending to backend:", teachers);
      const result = await teachersApi.bulkCreate(teachers);

      console.log("✅ Import result:", result);

      // ✅ Extract data properly
      const data = result?.data || result;

      setImportResult(data);
      setShowResult(true);

      // Auto-close if all successful
      if (data.success > 0 && data.failed === 0) {
        setTimeout(() => {
          handleCloseResult();
        }, 2000);
      }
    } catch (error: any) {
      console.error("❌ Import error:", error);
      // Error toast is handled in BulkTeacherGrid
    } finally {
      setImporting(false);
    }
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setImportResult(null);
    loadExistingTeachers(); // ✅ Reload to show new teachers
    onSuccess();
  };

  if (loadingExisting) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">
            កំពុងផ្ទុកទិន្នន័យគ្រូបង្រៀន...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full min-w-0">
      {/* ✅ Pass existing teachers to grid */}
      <BulkTeacherGrid
        subjects={subjects}
        existingTeachers={existingTeachers}
        onSave={handleSave}
      />

      {/* Success Modal */}
      {showResult && importResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="bg-green-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-koulen">
                      បញ្ចូលទិន្នន័យបានជោគជ័យ!
                    </h2>
                    <p className="text-sm text-green-100 mt-1">
                      Import completed successfully
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseResult}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-center">
                  <div className="text-3xl font-moul text-blue-600 mb-1">
                    {importResult.total || 0}
                  </div>
                  <div className="text-xs text-blue-800 font-bold uppercase">
                    សរុបទាំងអស់
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
                  <div className="text-3xl font-moul text-green-600 mb-1">
                    {importResult.success || 0}
                  </div>
                  <div className="text-xs text-green-800 font-bold uppercase">
                    ជោគជ័យ
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-center">
                  <div className="text-3xl font-moul text-red-600 mb-1">
                    {importResult.failed || 0}
                  </div>
                  <div className="text-xs text-red-800 font-bold uppercase">
                    បរាជ័យ
                  </div>
                </div>
              </div>

              {/* Success List */}
              {importResult.results?.success?.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-green-700 mb-3 flex items-center gap-2">
                    ✅ បញ្ជីគ្រូដែលបានបង្កើតជោគជ័យ (
                    {importResult.results.success.length})
                  </h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
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
                          {item.employeeId}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed List */}
              {importResult.results?.failed?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
                    ❌ បញ្ជីគ្រូដែលបរាជ័យ ({importResult.results.failed.length})
                  </h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
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
