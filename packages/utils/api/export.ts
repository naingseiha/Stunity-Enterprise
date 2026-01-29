import { apiClient } from "./client";

export interface ExportOptions {
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

export interface ExportPreview {
  className: string;
  grade: string;
  section?: string;
  academicYear: string;
  totalStudents: number;
  maleStudents: number;
  femaleStudents: number;
  classInstructor: string;
  suggestedFilename: string;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: Array<{
    row: number;
    data: any;
    error: string;
  }>;
  importedStudents: any[];
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export const exportApi = {
  /**
   * ✅ Export students by class to Excel
   */
  async exportStudentsByClass(
    classId: string,
    options: ExportOptions
  ): Promise<Blob> {
    try {
      const url = `${API_BASE_URL}/export/students/class/${classId}`;

      console.log("📤 Exporting to URL:", url);
      console.log("📦 Options:", options);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        let errorMessage = "Export failed";
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      console.log("✅ Export successful, blob size:", blob.size);
      return blob;
    } catch (error: any) {
      console.error("❌ Export error:", error);
      throw error;
    }
  },

  /**
   * ✅ Download blank import template
   */
  async downloadImportTemplate(
    classId: string,
    options?: {
      schoolName?: string;
      provinceName?: string;
      academicYear?: string;
    }
  ): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      if (options?.schoolName) params.append("schoolName", options.schoolName);
      if (options?.provinceName)
        params.append("provinceName", options.provinceName);
      if (options?.academicYear)
        params.append("academicYear", options.academicYear);

      const url = `${API_BASE_URL}/export/template/import/${classId}?${params.toString()}`;

      console.log("📥 Downloading import template:", url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download template");
      }

      const blob = await response.blob();
      console.log("✅ Template downloaded, blob size:", blob.size);
      return blob;
    } catch (error: any) {
      console.error("❌ Template download error:", error);
      throw error;
    }
  },

  /**
   * ✅ Import students from Excel file
   */
  async importStudentsFromExcel(
    classId: string,
    file: File
  ): Promise<ImportResult> {
    try {
      const url = `${API_BASE_URL}/export/import/${classId}`;

      console.log("📤 Uploading file:", file.name);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Import failed");
      }

      const result = await response.json();
      console.log("✅ Import result:", result);
      return result.data;
    } catch (error: any) {
      console.error("❌ Import error:", error);
      throw error;
    }
  },

  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    console.log("✅ File download triggered:", filename);
  },

  async getExportPreview(classId: string): Promise<ExportPreview> {
    try {
      console.log("👁️ Getting export preview for class:", classId);

      const response = await apiClient.get<{
        success: boolean;
        data: ExportPreview;
      }>(`/export/preview/${classId}`);

      console.log("✅ Preview received:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("❌ Preview error:", error);
      throw error;
    }
  },

  async getAvailableTemplates(): Promise<string[]> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: string[];
      }>("/export/templates");
      return response.data;
    } catch (error: any) {
      console.error("❌ Get templates error:", error);
      return [];
    }
  },
};
