import { STUDENT_SERVICE_URL } from "./config";

export type AdmissionApplicantType =
  | "NEW_STUDENT"
  | "RETURNING_STUDENT"
  | "TRANSFER_IN";
export type AdmissionStatus =
  | "DRAFT"
  | "RECEIVED"
  | "UNDER_REVIEW"
  | "WAITLISTED"
  | "APPROVED"
  | "REJECTED"
  | "ENROLLED"
  | "WITHDRAWN";

export interface AdmissionApplication {
  id: string;
  applicationNumber: string;
  applicantType: AdmissionApplicantType;
  status: AdmissionStatus;
  academicYearId: string;
  requestedGrade?: string | null;
  firstName: string;
  lastName: string;
  englishFirstName?: string | null;
  englishLastName?: string | null;
  gender: "MALE" | "FEMALE";
  dateOfBirth: string;
  phoneNumber?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  notes?: string | null;
  createdAt: string;
  academicYear?: { id: string; name: string };
  targetClass?: { id: string; name: string; grade: string } | null;
  student?: {
    id: string;
    studentId: string;
    class?: { name: string; grade: string } | null;
  } | null;
}

export interface AdmissionInput {
  applicantType: "NEW_STUDENT" | "RETURNING_STUDENT";
  academicYearId: string;
  studentId?: string;
  targetClassId?: string;
  requestedGrade?: string;
  firstName?: string;
  lastName?: string;
  englishFirstName?: string;
  englishLastName?: string;
  gender?: "MALE" | "FEMALE";
  dateOfBirth?: string;
  phoneNumber?: string;
  email?: string;
  placeOfBirth?: string;
  currentAddress?: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  guardianPhone?: string;
  previousSchool?: string;
  previousGrade?: string;
  notes?: string;
}

async function admissionFetch(path: string, init?: RequestInit) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const response = await fetch(`${STUDENT_SERVICE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload.message || "Admission request failed");
  return payload;
}

export const getAdmissionApplications = (
  params: Record<string, string | number | undefined>,
) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(
    ([key, value]) =>
      value !== undefined && value !== "" && query.set(key, String(value)),
  );
  return admissionFetch(`/admissions?${query}`);
};

export const getAdmissionSummary = (academicYearId?: string) =>
  admissionFetch(
    `/admissions/summary${academicYearId ? `?academicYearId=${encodeURIComponent(academicYearId)}` : ""}`,
  );

export const createAdmissionApplication = (data: AdmissionInput) =>
  admissionFetch("/admissions", { method: "POST", body: JSON.stringify(data) });

export const updateAdmissionStatus = (
  id: string,
  status: AdmissionStatus,
  notes?: string,
) =>
  admissionFetch(`/admissions/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, notes }),
  });

export const enrollAdmission = (
  id: string,
  options: { classId?: string; leaveUnassigned?: boolean },
) =>
  admissionFetch(`/admissions/${id}/enroll`, {
    method: "POST",
    body: JSON.stringify(options),
  });
