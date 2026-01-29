"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { gradeApi } from "@/lib/api/grades";
import type { Class } from "@/lib/api/classes";

interface ImportGradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: Class;
  month: string;
  year: number;
  onImportSuccess?: () => void;
}

export default function ImportGradesModal({
  isOpen,
  onClose,
  classData,
  month,
  year,
  onImportSuccess,
}: ImportGradesModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    try {
      const importResult = await gradeApi.importGrades(
        classData.id,
        selectedFile
      );
      setResult(importResult);

      if (importResult.success && onImportSuccess) {
        setTimeout(() => {
          onImportSuccess();
          handleClose();
        }, 2000);
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || "Import failed",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setResult(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="នាំចូលពិន្ទុពី Excel • Import Grades"
      size="md"
    >
      <div className="space-y-6">
        {/* Class Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">
            ថ្នាក់: {classData.name}
          </h3>
          <p className="text-sm text-blue-700">
            ខែ: {month} {year} • សិស្ស: {classData._count?.students || 0} នាក់
          </p>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ជ្រើសរើសឯកសារ Excel:
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-purple-50 file:text-purple-700
              hover:file:bg-purple-100
              cursor-pointer"
          />
          {selectedFile && (
            <p className="mt-2 text-sm text-gray-600">
              ✓ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 mb-2">
            📋 មគ្គុទ្ទេសក៍:
          </h4>
          <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
            <li>ឯកសារត្រូវតែជា Excel format (.xlsx, .xls)</li>
            <li>ឯកសារត្រូវមានទម្រង់តាមគំរូដែលកំណត់</li>
            <li>ពិន្ទុត្រូវតែជាលេខ និងស្ថិតក្នុងដែនកំណត់</li>
            <li>ឈ្មោះសិស្សត្រូវតែត្រូវគ្នាជាមួយក្នុង database</li>
          </ul>
        </div>

        {/* Import Result */}
        {result && (
          <div
            className={`border rounded-lg p-4 ${
              result.success
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p
                  className={`font-semibold ${
                    result.success ? "text-green-900" : "text-red-900"
                  }`}
                >
                  {result.success
                    ? "✅ នាំចូលជោគជ័យ! • Import Successful!"
                    : "❌ នាំចូលមានបញ្ហា • Import Failed"}
                </p>
                {result.success && (
                  <div className="text-sm mt-2 space-y-1">
                    <p className="text-green-700">
                      👥 សិស្សសរុប: {result.totalStudents} នាក់
                    </p>
                    <p className="text-green-700">
                      ✓ ជោគជ័យ: {result.importedStudents} នាក់
                    </p>
                    {result.errorStudents > 0 && (
                      <p className="text-red-600">
                        ✗ មានកំហុស: {result.errorStudents} នាក់
                      </p>
                    )}
                  </div>
                )}
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-3 max-h-40 overflow-y-auto">
                    <p className="text-sm font-semibold text-red-800 mb-1">
                      កំហុស:
                    </p>
                    {result.errors.map((err: any, idx: number) => (
                      <p key={idx} className="text-sm text-red-700">
                        • Row {err.row}: {err.error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button onClick={handleClose} variant="secondary">
            បិទ • Close
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>កំពុងនាំចូល...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>នាំចូល • Import</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
