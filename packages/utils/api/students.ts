// Student API Service

import { apiClient } from "./client";
import { parseDate } from "../utils/dateParser";
import { apiCache } from "../cache";

export interface Student {
  id: string;
  studentId?: string;
  khmerName?: string;
  englishName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  gender: "male" | "female";
  dateOfBirth: string;
  placeOfBirth?: string;
  currentAddress?: string;
  phoneNumber?: string;
  address?: string;
  phone?: string;
  guardianName?: string;
  guardianPhone?: string;
  classId?: string;
  userId?: string;
  class?: {
    id: string;
    classId?: string;
    name: string;
    grade: string;
    section?: string;
  };

  // Parent Information
  fatherName?: string;
  motherName?: string;
  parentPhone?: string;
  parentOccupation?: string;

  // Academic History
  previousGrade?: string;
  previousSchool?: string;
  repeatingGrade?: string;
  transferredFrom?: string;

  // Grade 9 Exam
  grade9ExamSession?: string;
  grade9ExamCenter?: string;
  grade9ExamRoom?: string;
  grade9ExamDesk?: string;
  grade9PassStatus?: string;

  // Grade 12 Exam
  grade12ExamSession?: string;
  grade12ExamCenter?: string;
  grade12ExamRoom?: string;
  grade12ExamDesk?: string;
  grade12PassStatus?: string;
  grade12Track?: string;

  // Student Role & Status
  studentRole?: "GENERAL" | "CLASS_LEADER" | "VICE_LEADER_1" | "VICE_LEADER_2";
  isAccountActive?: boolean;

  // General
  remarks?: string;
  photoUrl?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStudentData {
  // ✅ Basic Info
  khmerName?: string;
  englishName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  dateOfBirth: string;
  gender: "male" | "female";
  placeOfBirth?: string;
  currentAddress?: string;
  phoneNumber?: string;
  address?: string;
  phone?: string;
  classId?: string;

  // ✅ Parent Information
  fatherName?: string;
  motherName?: string;
  parentPhone?: string;
  parentOccupation?: string;
  guardianName?: string;
  guardianPhone?: string;

  // ✅ Academic History
  previousGrade?: string;
  previousSchool?: string;
  repeatingGrade?: string;
  transferredFrom?: string;

  // ✅ Grade 9 Exam
  grade9ExamSession?: string;
  grade9ExamCenter?: string;
  grade9ExamRoom?: string;
  grade9ExamDesk?: string;
  grade9PassStatus?: string;

  // ✅ Grade 12 Exam
  grade12ExamSession?: string;
  grade12ExamCenter?: string;
  grade12ExamRoom?: string;
  grade12ExamDesk?: string;
  grade12PassStatus?: string;
  grade12Track?: string;

  // ✅ General
  remarks?: string;
  photoUrl?: string;
}

export interface BulkStudentData {
  name: string;
  gender: string;
  dateOfBirth: string;
  previousGrade?: string;
  previousSchool?: string;
  repeatingGrade?: string;
  transferredFrom?: string;
  remarks?: string;
  grade9ExamSession?: string;
  grade9ExamCenter?: string;
  grade9ExamRoom?: string;
  grade9ExamDesk?: string;
  grade9PassStatus?: string;
  grade12ExamSession?: string;
  grade12ExamCenter?: string;
  grade12ExamRoom?: string;
  grade12ExamDesk?: string;
  grade12PassStatus?: string;
  grade12Track?: string;
}

export interface BulkImportResponse {
  success: boolean;
  message: string;
  data: {
    total: number;
    success: number;
    failed: number;
    results: {
      success: Array<{
        row: number;
        studentId: string;
        name: string;
      }>;
      failed: Array<{
        row: number;
        name: string;
        error: string;
      }>;
    };
  };
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface StudentsResponse {
  success: boolean;
  data: Student[];
  pagination?: PaginationInfo;
}

export interface StudentResponse {
  success: boolean;
  data: Student;
  message?: string;
}

const mapGenderToBackend = (gender: "male" | "female" | string): string => {
  const g = gender.toLowerCase();
  if (g === "male" || g === "m" || g === "ប" || g === "ប្រុស") {
    return "MALE";
  }
  return "FEMALE";
};

const mapGenderToFrontend = (gender: string): "male" | "female" => {
  return gender === "MALE" ? "male" : "female";
};

const transformStudent = (backendStudent: any): Student => {
  return {
    ...backendStudent,
    gender: mapGenderToFrontend(backendStudent.gender),
    firstName:
      backendStudent.firstName ||
      backendStudent.englishName?.split(" ")[0] ||
      "",
    lastName:
      backendStudent.lastName ||
      backendStudent.englishName?.split(" ")[1] ||
      "",
    email: backendStudent.email || `${backendStudent.studentId}@student.com`,
    phone: backendStudent.phone || backendStudent.phoneNumber,
    address: backendStudent.address || backendStudent.currentAddress,
  };
};

const transformToBackend = (frontendData: CreateStudentData): any => {
  const payload: any = {
    // ✅ Required fields
    firstName: frontendData.firstName?.trim() || "",
    lastName: frontendData.lastName?.trim() || "",
    khmerName:
      frontendData.khmerName?.trim() ||
      `${frontendData.firstName} ${frontendData.lastName}`,
    gender: mapGenderToBackend(frontendData.gender),
    dateOfBirth: frontendData.dateOfBirth,
  };

  // ✅ Optional fields - only add if provided
  if (frontendData.email) payload.email = frontendData.email.trim();
  if (frontendData.englishName)
    payload.englishName = frontendData.englishName.trim();
  if (frontendData.placeOfBirth)
    payload.placeOfBirth = frontendData.placeOfBirth.trim();
  if (frontendData.currentAddress)
    payload.currentAddress = frontendData.currentAddress.trim();
  if (frontendData.phoneNumber)
    payload.phoneNumber = frontendData.phoneNumber.trim();
  if (frontendData.classId) payload.classId = frontendData.classId.trim();

  // ✅ Parent Information
  if (frontendData.fatherName)
    payload.fatherName = frontendData.fatherName.trim();
  if (frontendData.motherName)
    payload.motherName = frontendData.motherName.trim();
  if (frontendData.parentPhone)
    payload.parentPhone = frontendData.parentPhone.trim();
  if (frontendData.parentOccupation)
    payload.parentOccupation = frontendData.parentOccupation.trim();

  // ✅ Academic History
  if (frontendData.previousGrade)
    payload.previousGrade = frontendData.previousGrade.trim();
  if (frontendData.previousSchool)
    payload.previousSchool = frontendData.previousSchool.trim();
  if (frontendData.repeatingGrade)
    payload.repeatingGrade = frontendData.repeatingGrade.trim();
  if (frontendData.transferredFrom)
    payload.transferredFrom = frontendData.transferredFrom.trim();

  // ✅ Grade 9 Exam
  if (frontendData.grade9ExamSession)
    payload.grade9ExamSession = frontendData.grade9ExamSession.trim();
  if (frontendData.grade9ExamCenter)
    payload.grade9ExamCenter = frontendData.grade9ExamCenter.trim();
  if (frontendData.grade9ExamRoom)
    payload.grade9ExamRoom = frontendData.grade9ExamRoom.trim();
  if (frontendData.grade9ExamDesk)
    payload.grade9ExamDesk = frontendData.grade9ExamDesk.trim();
  if (frontendData.grade9PassStatus)
    payload.grade9PassStatus = frontendData.grade9PassStatus.trim();

  // ✅ Grade 12 Exam
  if (frontendData.grade12ExamSession)
    payload.grade12ExamSession = frontendData.grade12ExamSession.trim();
  if (frontendData.grade12ExamCenter)
    payload.grade12ExamCenter = frontendData.grade12ExamCenter.trim();
  if (frontendData.grade12ExamRoom)
    payload.grade12ExamRoom = frontendData.grade12ExamRoom.trim();
  if (frontendData.grade12ExamDesk)
    payload.grade12ExamDesk = frontendData.grade12ExamDesk.trim();
  if (frontendData.grade12PassStatus)
    payload.grade12PassStatus = frontendData.grade12PassStatus.trim();
  if (frontendData.grade12Track)
    payload.grade12Track = frontendData.grade12Track.trim();

  // ✅ General
  if (frontendData.remarks) payload.remarks = frontendData.remarks.trim();
  if (frontendData.photoUrl) payload.photoUrl = frontendData.photoUrl.trim();

  // ✅ Legacy fields
  if (frontendData.address) payload.address = frontendData.address.trim();
  if (frontendData.phone) payload.phone = frontendData.phone.trim();
  if (frontendData.guardianName)
    payload.guardianName = frontendData.guardianName.trim();
  if (frontendData.guardianPhone)
    payload.guardianPhone = frontendData.guardianPhone.trim();

  return payload;
};

export const studentsApi = {
  /**
   * Get all students (LIGHTWEIGHT - fast loading for grids/lists)
   * ⚡ OPTIMIZED with pagination support
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 50)
   * @returns Students response with pagination info
   */
  async getAllLightweight(
    page: number = 1,
    limit: number = 50,
    classId?: string,
    gender?: string
  ): Promise<StudentsResponse> {
    try {
      const cacheKey = `students:lightweight:page${page}:limit${limit}:class${classId || "all"}:gender${gender || "all"}`;

      return apiCache.getOrFetch(
        cacheKey,
        async () => {
          // Build query params
          const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
          });
          if (classId && classId !== "all") {
            params.append("classId", classId);
          }
          if (gender && gender !== "all") {
            params.append("gender", gender);
          }

          console.log(`⚡ Fetching students (lightweight) - Page ${page}, Limit ${limit}, Class: ${classId || "all"}, Gender: ${gender || "all"}...`);

          // Fetch raw response without auto-unwrapping
          const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api"}/students/lightweight?${params.toString()}`;
          const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

          const response = await fetch(url, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            cache: "no-store",
            credentials: "include", // ✅ iOS 16 FIX: Required for PWA mode
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const fullResponse = await response.json();

          // fullResponse should be { success: true, data: [...], pagination: {...} }
          if (fullResponse.success && Array.isArray(fullResponse.data)) {
            console.log(`⚡ Fetched ${fullResponse.data.length} students (page ${page}/${fullResponse.pagination?.totalPages || 1})`);
            return {
              success: true,
              data: fullResponse.data.map(transformStudent),
              pagination: fullResponse.pagination,
            };
          }

          console.error("❌ Unexpected response format:", fullResponse);
          return {
            success: false,
            data: [],
          };
        },
        3 * 60 * 1000 // 3 minutes cache
      );
    } catch (error: any) {
      console.error("❌ Error fetching students (lightweight):", error);
      return {
        success: false,
        data: [],
      };
    }
  },

  /**
   * Get all students (FULL DATA - slower but complete)
   */
  async getAll(): Promise<Student[]> {
    try {
      console.log("📋 Fetching students (full data)...");
      const students = await apiClient.get<Student[]>("/students");

      if (!Array.isArray(students)) {
        console.error("❌ Expected array but got:", students);
        return [];
      }

      console.log(`✅ Fetched ${students.length} students`);
      return students.map(transformStudent);
    } catch (error: any) {
      console.error("❌ Error fetching students:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Student> {
    try {
      const student = await apiClient.get<Student>(`/students/${id}`);
      return transformStudent(student);
    } catch (error: any) {
      console.error("❌ Error fetching student:", error);
      throw new Error(error.message || "Failed to fetch student");
    }
  },

  async create(data: CreateStudentData): Promise<Student> {
    try {
      const backendData = transformToBackend(data);
      const student = await apiClient.post<Student>("/students", backendData);
      return transformStudent(student);
    } catch (error: any) {
      throw new Error(error.message || "Failed to create student");
    }
  },

  async bulkCreate(
    classId: string,
    students: BulkStudentData[]
  ): Promise<BulkImportResponse> {
    try {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📤 FRONTEND: Bulk creating students");
      console.log("📊 Class ID:", classId);
      console.log("👥 Students count:", students.length);

      const payload = {
        classId,
        students: students.map((student, index) => {
          try {
            const parsedDate = parseDate(student.dateOfBirth);

            return {
              name: student.name.trim(),
              gender: student.gender.trim(),
              dateOfBirth: parsedDate,
              previousGrade: student.previousGrade?.trim() || undefined,
              previousSchool: student.previousSchool?.trim() || undefined,
              repeatingGrade: student.repeatingGrade?.trim() || undefined,
              transferredFrom: student.transferredFrom?.trim() || undefined,
              remarks: student.remarks?.trim() || undefined,
              grade9ExamSession: student.grade9ExamSession?.trim() || undefined,
              grade9ExamCenter: student.grade9ExamCenter?.trim() || undefined,
              grade9ExamRoom: student.grade9ExamRoom?.trim() || undefined,
              grade9ExamDesk: student.grade9ExamDesk?.trim() || undefined,
              grade9PassStatus: student.grade9PassStatus?.trim() || undefined,
              grade12ExamSession:
                student.grade12ExamSession?.trim() || undefined,
              grade12ExamCenter: student.grade12ExamCenter?.trim() || undefined,
              grade12ExamRoom: student.grade12ExamRoom?.trim() || undefined,
              grade12ExamDesk: student.grade12ExamDesk?.trim() || undefined,
              grade12PassStatus: student.grade12PassStatus?.trim() || undefined,
              grade12Track: student.grade12Track?.trim() || undefined,
            };
          } catch (error: any) {
            console.error(
              `❌ Row ${index + 1} date parsing error:`,
              error.message
            );
            throw new Error(`Row ${index + 1}: ${error.message}`);
          }
        }),
      };

      console.log("📦 Sending payload.. .");

      // ✅ Call API and get raw response
      const rawResponse = await apiClient.post<any>("/students/bulk", payload);

      console.log("📥 Raw response:", rawResponse);

      // ✅ Handle different response structures
      let response: BulkImportResponse;

      if (rawResponse.success !== undefined && rawResponse.data !== undefined) {
        // Structure: { success, data: { total, success, failed, results } }
        response = {
          success: rawResponse.success,
          message: rawResponse.message || "",
          data: rawResponse.data,
        };
      } else if (rawResponse.total !== undefined) {
        // Structure: { total, success, failed, results } (direct data)
        response = {
          success: true,
          message: "Bulk import completed",
          data: rawResponse,
        };
      } else {
        throw new Error("Invalid response structure");
      }

      console.log("✅ Parsed response:", response);
      console.log(
        `   - Success: ${response.data.success}/${response.data.total}`
      );
      console.log(
        `   - Failed: ${response.data.failed}/${response.data.total}`
      );
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      return response;
    } catch (error: any) {
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("❌ BULK IMPORT ERROR:", error);
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      throw new Error(error.message || "Failed to bulk create students");
    }
  },

  async update(id: string, data: Partial<CreateStudentData>): Promise<Student> {
    try {
      const backendData = transformToBackend(data as CreateStudentData);
      const student = await apiClient.put<Student>(
        `/students/${id}`,
        backendData
      );
      return transformStudent(student);
    } catch (error: any) {
      console.error("❌ Error updating student:", error);
      throw new Error(error.message || "Failed to update student");
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`/students/${id}`);
    } catch (error: any) {
      console.error("❌ Error deleting student:", error);
      throw new Error(error.message || "Failed to delete student");
    }
  },

  async getByClass(classId: string): Promise<Student[]> {
    try {
      const allStudents = await this.getAll();
      return allStudents.filter((student) => student.classId === classId);
    } catch (error: any) {
      console.error("❌ Error fetching students by class:", error);
      return [];
    }
  },
};
