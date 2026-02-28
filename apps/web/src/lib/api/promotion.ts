const SCHOOL_SERVICE_URL = process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002';
const STUDENT_SERVICE_URL = process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003';

export interface EligibleStudent {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  khmerName: string;
  gender: string;
  dateOfBirth: string;
}

export interface ClassWithStudents {
  class: {
    id: string;
    name: string;
    grade: string;
    section: string | null;
  };
  studentCount: number;
  students: EligibleStudent[];
}

export interface EligibleStudentsResponse {
  academicYear: {
    id: string;
    name: string;
    status: string;
  };
  totalClasses: number;
  totalStudents: number;
  classesByGrade: ClassWithStudents[];
}

export interface PromotionPreview {
  fromClass: {
    id: string;
    name: string;
    grade: string;
    section: string | null;
  };
  studentCount: number;
  nextGrade: string | null;
  targetClasses: Array<{
    id: string;
    name: string;
    grade: string;
    section: string | null;
    capacity: number | null;
  }>;
  willGraduate: boolean;
}

export interface PromotionPreviewResponse {
  fromYear: {
    id: string;
    name: string;
  };
  toYear: {
    id: string;
    name: string;
  };
  preview: PromotionPreview[];
  summary: {
    totalClasses: number;
    totalStudents: number;
    graduatingStudents: number;
    promotingStudents: number;
  };
}

export interface PromotionRequest {
  studentId: string;
  fromClassId: string;
  toClassId: string;
  promotionType: 'AUTOMATIC' | 'MANUAL' | 'REPEAT';
  notes?: string;
}

export interface PromotionResult {
  promoted: number;
  repeated: number;
  graduated: number;
  failed: number;
  errors: Array<{
    studentId: string;
    error: string;
  }>;
}

export interface PromotionResponse {
  fromYear: {
    id: string;
    name: string;
  };
  toYear: {
    id: string;
    name: string;
  };
  promotionDate: string;
  results: PromotionResult;
}

export interface ProgressionRecord {
  id: string;
  studentId: string;
  fromAcademicYearId: string;
  toAcademicYearId: string;
  fromClassId: string;
  toClassId: string;
  promotionType: string;
  promotionDate: string;
  promotedBy: string;
  notes: string | null;
  student?: {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
  };
  fromClass?: {
    name: string;
    grade: string;
  };
  toClass?: {
    name: string;
    grade: string;
  };
}

export interface PromotionReportResponse {
  academicYear: {
    id: string;
    name: string;
    promotionDate: string;
  };
  statistics: {
    total: number;
    promoted: number;
    repeated: number;
    transferred: number;
  };
  progressions: ProgressionRecord[];
}

/**
 * Get eligible students for promotion from an academic year
 */
export async function getEligibleStudents(
  schoolId: string,
  academicYearId: string,
  token?: string
): Promise<EligibleStudentsResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(
    `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${academicYearId}/promotion/eligible-students`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Failed to fetch eligible students: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Get promotion preview showing where students will be promoted
 */
export async function getPromotionPreview(
  schoolId: string,
  fromYearId: string,
  toYearId: string,
  token?: string
): Promise<PromotionPreviewResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(
    `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${fromYearId}/promotion/preview`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ toAcademicYearId: toYearId }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || errorData.message || `Failed to get promotion preview: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Promote students from one academic year to another
 */
export async function promoteStudents(
  schoolId: string,
  fromYearId: string,
  toYearId: string,
  promotions: PromotionRequest[],
  promotedBy: string,
  token?: string
): Promise<PromotionResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(
    `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${fromYearId}/promote-students`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        toAcademicYearId: toYearId,
        promotions,
        promotedBy,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || errorData.message || `Failed to promote students: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Undo student promotion (within 24 hours)
 */
export async function undoPromotion(
  schoolId: string,
  academicYearId: string
): Promise<{ undoneCount: number }> {
  const response = await fetch(
    `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${academicYearId}/promotion/undo`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to undo promotion');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Get promotion report for an academic year
 */
export async function getPromotionReport(
  schoolId: string,
  academicYearId: string
): Promise<PromotionReportResponse> {
  const response = await fetch(
    `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${academicYearId}/promotion/report`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to get promotion report: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Get student progression history
 */
export async function getStudentProgression(
  studentId: string,
  token: string
): Promise<ProgressionRecord[]> {
  const response = await fetch(
    `${STUDENT_SERVICE_URL}/students/${studentId}/progression`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to get student progression: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.data.progressions;
}
