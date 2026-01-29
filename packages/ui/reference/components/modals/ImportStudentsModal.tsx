"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { exportApi, ImportResult } from "@/lib/api/export";
import {
  Upload,
  Download,
  FileSpreadsheet,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileDown,
  Info,
  Calendar,
} from "lucide-react";
import type { Class } from "@/lib/api/classes";

interface ImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: Class;
  onImportSuccess?: () => void;
}

export default function ImportStudentsModal({
  isOpen,
  onClose,
  classData,
  onImportSuccess,
}: ImportStudentsModalProps) {
  const [loading, setLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      console.log("📥 Downloading template for class:", classData.id);

      const blob = await exportApi.downloadImportTemplate(classData.id, {
        schoolName: "វិទ្យាល័យហ៊ុនសែន ភ្នំពេញ",
        provinceName: "រាជធានីភ្នំពេញ",
        academicYear: classData.academicYear || "2024-2025",
      });

      const filename = `Import_Template_${classData.name}_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;

      exportApi.downloadFile(blob, filename);

      alert(
        "✅ Template downloaded successfully!\n\nសូមបំពេញព័ត៌មានសិស្សហើយ upload ត្រលប់មកវិញ។"
      );
    } catch (error: any) {
      console.error("❌ Template download error:", error);
      alert(`❌ មិនអាចទាញយក template បានទេ!\n\n${error.message}`);
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        alert("❌ សូមជ្រើសរើស Excel file (.xlsx, .xls) តែប៉ុណ្ណោះ!");
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
      console.log("📎 File selected:", file.name);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      alert("❌ សូមជ្រើសរើស file ជាមុនសិន!");
      return;
    }

    try {
      setLoading(true);
      console.log("📤 Starting import...");

      const result = await exportApi.importStudentsFromExcel(
        classData.id,
        selectedFile
      );

      setImportResult(result);

      if (result.success) {
        alert(
          `✅ Import ជោគជ័យ!\n\n` +
            `បានបញ្ចូលសិស្ស: ${result.validRows} នាក់\n` +
            `កំហុស: ${result.errorRows} នាក់`
        );

        if (onImportSuccess) {
          onImportSuccess();
        }

        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        alert(
          `⚠️ Import ចប់ដោយមានកំហុស!\n\n` +
            `ជោគជ័យ: ${result.validRows} នាក់\n` +
            `កំហុស: ${result.errorRows} នាក់\n\n` +
            `សូមពិនិត្យមើលរបាយការណ៍លម្អិតខាងក្រោម។`
        );
      }
    } catch (error: any) {
      console.error("❌ Import error:", error);
      alert(`❌ មិនអាច import បានទេ!\n\n${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImportResult(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`នាំចូលសិស្សថ្នាក់ ${classData.name} • Import Students`}
      size="large"
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">ការណែនាំ • Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>ទាញយក template ទម្រង់ Excel ជាមុនសិន</li>
                <li>បំពេញព័ត៌មានសិស្ស:</li>
                <ul className="list-disc list-inside ml-6 space-y-0.5 mt-1">
                  <li>
                    <strong>ឈ្មោះ:</strong> គោត្តនាម នាមខ្លួន (ឧ. សុខ វិរៈ)
                  </li>
                  <li>
                    <strong>ភេទ:</strong> ប្រុស ឬ ស្រី
                  </li>
                  <li className="flex items-start gap-2">
                    <Calendar className="w-3 h-3 text-blue-700 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>ថ្ងៃខែឆ្នាំកំណើត:</strong>{" "}
                      <span className="text-blue-700 font-semibold">
                        អាចប្រើ: 29/12/2008 ឬ 29/12/08 ឬ 2008-12-29
                      </span>
                    </span>
                  </li>
                </ul>
                <li className="mt-2">រក្សាទុក file ហើយ upload ត្រលប់មកវិញ</li>
                <li>System នឹងបញ្ចូលសិស្សចូលក្នុង database ស្វ័យប្រវត្តិ</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Date Format Helper */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-green-800">
              <p className="font-semibold mb-1">
                ទម្រង់ថ្ងៃខែដែលទទួលយក • Supported Date Formats:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>✅ 29/12/2008</div>
                <div>✅ 29/12/08</div>
                <div>✅ 2008-12-29</div>
                <div>✅ 29-12-2008</div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Download Template */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <span className="text-purple-600 font-bold">1</span>
            </div>
            <h3 className="font-semibold text-gray-900">
              ទាញយក Template • Download Template
            </h3>
          </div>

          <Button
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
            variant="secondary"
            className="w-full"
          >
            {downloadingTemplate ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>កំពុងទាញយក...</span>
              </>
            ) : (
              <>
                <FileDown className="w-5 h-5" />
                <span>ទាញយក Excel Template</span>
              </>
            )}
          </Button>
        </div>

        {/* Step 2: Upload File */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <span className="text-purple-600 font-bold">2</span>
            </div>
            <h3 className="font-semibold text-gray-900">
              Upload File • បញ្ចូល File
            </h3>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <FileSpreadsheet className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-1">
                Click to upload Excel file
              </p>
              <p className="text-xs text-gray-500">.xlsx, .xls files only</p>
            </label>
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-green-600">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Import Result */}
        {importResult && (
          <div
            className={`p-4 rounded-lg border ${
              importResult.success
                ? "bg-green-50 border-green-200"
                : "bg-yellow-50 border-yellow-200"
            }`}
          >
            <div className="flex items-start gap-3">
              {importResult.success ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">
                  {importResult.success
                    ? "✅ Import ជោគជ័យ!"
                    : "⚠️ Import ចប់ដោយមានកំហុស"}
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <p className="text-gray-600">ជួរសរុប:</p>
                    <p className="font-bold text-gray-900">
                      {importResult.totalRows}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">ជោគជ័យ:</p>
                    <p className="font-bold text-green-600">
                      {importResult.validRows}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">កំហុស:</p>
                    <p className="font-bold text-red-600">
                      {importResult.errorRows}
                    </p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="mt-3 p-3 bg-white rounded border max-h-48 overflow-y-auto">
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                      កំហុសលម្អិត • Error Details:
                    </p>
                    <div className="space-y-1">
                      {importResult.errors.map((error, index) => (
                        <div
                          key={index}
                          className="text-xs text-red-600 flex gap-2"
                        >
                          <span className="font-medium">Row {error.row}:</span>
                          <span>{error.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            <X className="w-5 h-5" />
            <span>បិទ • Close</span>
          </Button>

          <Button onClick={handleImport} disabled={loading || !selectedFile}>
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>កំពុងនាំចូល...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>នាំចូល Import</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
