"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { exportApi } from "@/lib/api/export"; // ✅ Import exportApi only
import {
  Download,
  FileSpreadsheet,
  X,
  Loader2,
  Settings,
  School,
  User,
  Calendar,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import type { Class } from "@/lib/api/classes";

// ✅ Define interfaces locally to avoid import issues
interface ExportOptions {
  schoolName?: string;
  provinceName?: string;
  academicYear?: string;
  directorDetails?: string;
  instructorDetails?: string;
  classInstructor?: string;
  examSession?: string;
  examCode?: string;
  showExamInfo?: boolean;
  showPhoneNumber?: boolean;
  showAddress?: boolean;
  showStudentId?: boolean;
}

interface ExportPreview {
  className: string;
  grade: string;
  section?: string;
  academicYear: string; // ✅ Include this
  totalStudents: number;
  maleStudents: number;
  femaleStudents: number;
  classInstructor: string;
  suggestedFilename: string;
}

interface ExportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: Class;
}

export default function ExportStudentsModal({
  isOpen,
  onClose,
  classData,
}: ExportStudentsModalProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Export options state
  const [options, setOptions] = useState<ExportOptions>({
    schoolName: "វិទ្យាល័យហ៊ុនសែន ភ្នំពេញ",
    provinceName: "រាជធានីភ្នំពេញ",
    academicYear: "2024-2025",
    directorDetails: "នាយកសាលា",
    instructorDetails: "",
    classInstructor: "",
    examSession: "",
    examCode: "",
    showExamInfo: false,
    showPhoneNumber: true,
    showAddress: true,
    showStudentId: true,
  });

  // Load preview when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPreview();
    } else {
      setPreview(null);
      setPreviewError(null);
    }
  }, [isOpen, classData.id]);

  const loadPreview = async () => {
    try {
      setLoadingPreview(true);
      setPreviewError(null);

      const previewData = await exportApi.getExportPreview(classData.id);

      setPreview(previewData);

      // ✅ Use optional chaining
      setOptions((prev) => ({
        ...prev,
        classInstructor: (previewData as any)?.classInstructor ?? "",
        instructorDetails: (previewData as any)?.classInstructor ?? "",
      }));
    } catch (error: any) {
      console.error("❌ Preview error:", error);
      setPreviewError(error.message || "Failed to load preview");

      setPreview({
        className: classData.name,
        grade: classData.grade,
        section: classData.section,
        academicYear: classData.academicYear || "2024-2025",
        totalStudents: classData._count?.students || 0,
        maleStudents: 0,
        femaleStudents: 0,
        classInstructor: "មិនទាន់កំណត់",
        suggestedFilename: `Students_${classData.name}_${
          new Date().toISOString().split("T")[0]
        }.xlsx`,
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      console.log("📤 Starting export...", options);

      const blob = await exportApi.exportStudentsByClass(classData.id, options);

      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `បញ្ជីសិស្ស_${classData.name}_${timestamp}.xlsx`;

      exportApi.downloadFile(blob, filename);

      alert(
        `✅ ទាញយកជោគជ័យ!\n\nបានរក្សាទុកជា: ${filename}\n\nFile downloaded successfully!`
      );

      onClose();
    } catch (error: any) {
      console.error("❌ Export error:", error);
      alert(`❌ មិនអាចទាញយកបានទេ!\n\n${error.message || "Export failed"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`នាំចេញសិស្សថ្នាក់ ${classData.name} • Export Students`}
      size="large"
    >
      <div className="space-y-6">
        {/* Preview Section */}
        {loadingPreview ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <span className="ml-3 text-gray-600">កំពុងផ្ទុកព័ត៌មាន...</span>
          </div>
        ) : previewError ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">
                  ព័ត៌មានមិនអាចផ្ទុកបាន • Preview unavailable
                </p>
                <p className="text-xs text-yellow-700 mt-1">{previewError}</p>
                <p className="text-xs text-yellow-600 mt-2">
                  អ្នកនៅតែអាច export បានដោយប្រើតម្លៃលំនាំដើម
                </p>
              </div>
            </div>
          </div>
        ) : preview ? (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-800 mb-3">
              <FileSpreadsheet className="w-5 h-5" />
              <h3 className="font-semibold">
                ព័ត៌មានថ្នាក់ • Class Information
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">ថ្នាក់:</span>
                <span className="ml-2 font-medium">{preview.className}</span>
              </div>
              <div>
                <span className="text-gray-600">ឆ្នាំសិក្សា:</span>
                <span className="ml-2 font-medium">{preview.academicYear}</span>
              </div>
              <div>
                <span className="text-gray-600">សិស្សសរុប:</span>
                <span className="ml-2 font-medium text-blue-600">
                  {preview.totalStudents} នាក់
                </span>
              </div>
              <div>
                <span className="text-gray-600">សិស្សស្រី:</span>
                <span className="ml-2 font-medium text-pink-600">
                  {preview.femaleStudents} នាក់
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">គ្រូប្រចាំថ្នាក់:</span>
                <span className="ml-2 font-medium">
                  {preview.classInstructor}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* School Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-900">
            <School className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">ព័ត៌មានសាលា • School Information</h3>
          </div>

          <Input
            label="ឈ្មោះសាលា • School Name"
            value={options.schoolName || ""}
            onChange={(e) =>
              setOptions({ ...options, schoolName: e.target.value })
            }
            placeholder="វិទ្យាល័យហ៊ុនសែន ភ្នំពេញ"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="ឈ្មោះខេត្ត • Province"
              value={options.provinceName || ""}
              onChange={(e) =>
                setOptions({ ...options, provinceName: e.target.value })
              }
              placeholder="រាជធានីភ្នំពេញ"
            />

            <Input
              label="ឆ្នាំសិក្សា • Academic Year"
              icon={<Calendar className="w-5 h-5" />}
              value={options.academicYear || ""}
              onChange={(e) =>
                setOptions({ ...options, academicYear: e.target.value })
              }
              placeholder="2024-2025"
            />
          </div>
        </div>

        {/* Instructor & Director Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-900">
            <User className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold">
              ព័ត៌មានអ្នកគ្រប់គ្រង • Management Info
            </h3>
          </div>

          <Input
            label="ឈ្មោះគ្រូប្រចាំថ្នាក់ • Class Instructor Name"
            value={options.classInstructor || ""}
            onChange={(e) =>
              setOptions({ ...options, classInstructor: e.target.value })
            }
            placeholder={preview?.classInstructor || "គ្រូប្រចាំថ្នាក់"}
          />

          <Input
            label="អ្វីដែលគ្រូចង់បង្ហាញ • Instructor Details"
            value={options.instructorDetails || ""}
            onChange={(e) =>
              setOptions({ ...options, instructorDetails: e.target.value })
            }
            placeholder="គ្រូស្រី ជា សុភា"
          />

          <Input
            label="អ្វីដែលនាយកចង់បង្ហាញ • Director Details"
            value={options.directorDetails || ""}
            onChange={(e) =>
              setOptions({ ...options, directorDetails: e.target.value })
            }
            placeholder="លោក ស៊ីន វុទ្ធី • នាយកសាលា"
          />
        </div>

        {/* Exam Settings (Optional) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-900">
              <Settings className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold">
                ព័ត៌មានប្រឡង • Exam Info (Optional)
              </h3>
            </div>
            <button
              type="button"
              onClick={() =>
                setOptions({ ...options, showExamInfo: !options.showExamInfo })
              }
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                options.showExamInfo
                  ? "bg-orange-100 text-orange-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {options.showExamInfo ? (
                <>
                  <Eye className="w-4 h-4 inline mr-1" />
                  បង្ហាញ
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 inline mr-1" />
                  លាក់
                </>
              )}
            </button>
          </div>

          {options.showExamInfo && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <Input
                label="សម័យប្រឡង • Exam Session"
                value={options.examSession || ""}
                onChange={(e) =>
                  setOptions({ ...options, examSession: e.target.value })
                }
                placeholder="ឆមាសទី១"
              />

              <Input
                label="ម.ប្រឡង • Exam Code"
                value={options.examCode || ""}
                onChange={(e) =>
                  setOptions({ ...options, examCode: e.target.value })
                }
                placeholder="2024-S1"
              />
            </div>
          )}
        </div>

        {/* Display Options */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-900">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">ជម្រើសបង្ហាញ • Display Options</h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={options.showStudentId !== false}
                onChange={(e) =>
                  setOptions({ ...options, showStudentId: e.target.checked })
                }
                className="w-4 h-4 text-purple-600"
              />
              <span className="text-sm">លេខសិស្ស</span>
            </label>

            <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={options.showPhoneNumber !== false}
                onChange={(e) =>
                  setOptions({ ...options, showPhoneNumber: e.target.checked })
                }
                className="w-4 h-4 text-purple-600"
              />
              <span className="text-sm">លេខទូរស័ព្ទ</span>
            </label>

            <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={options.showAddress !== false}
                onChange={(e) =>
                  setOptions({ ...options, showAddress: e.target.checked })
                }
                className="w-4 h-4 text-purple-600"
              />
              <span className="text-sm">អាសយដ្ឋាន</span>
            </label>
          </div>
        </div>

        {/* Info Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">ចំណាំ • Note:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>ទម្រង់ format នឹងត្រូវរក្សាទុកតាម template ដែលបានរចនា</li>
                <li>File នឹងត្រូវ download ស្វ័យប្រវត្តិបន្ទាប់ពីបង្កើតរួច</li>
                <li>
                  អ្នកអាចកែសម្រួល template នៅ folder{" "}
                  <code className="bg-blue-100 px-1 rounded">
                    api/templates/exports/
                  </code>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            <X className="w-5 h-5" />
            <span>បោះបង់ • Cancel</span>
          </Button>

          <Button onClick={handleExport} disabled={loading || loadingPreview}>
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>កំពុងនាំចេញ...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>នាំចេញ Excel • Export</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
