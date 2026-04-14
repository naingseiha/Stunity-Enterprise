/**
 * Assignments & Submissions API Client
 * 
 * Handles all API calls for club assignments and submissions
 */

import { clubsApi as api } from './client';

// ============================================================================
// Types
// ============================================================================

export type AssignmentType = 'HOMEWORK' | 'QUIZ' | 'EXAM' | 'PROJECT';
export type AssignmentStatus = 'DRAFT' | 'PUBLISHED';
export type SubmissionStatus = 'SUBMITTED' | 'LATE' | 'GRADED';

export interface ClubAssignment {
  id: string;
  clubId: string;
  subjectId?: string;
  subject?: {
    id: string;
    name: string;
    color?: string;
  };
  title: string;
  description?: string;
  instructions?: string;
  type: AssignmentType;
  status: AssignmentStatus;
  maxPoints: number;
  weight: number;
  dueDate: string;
  lateDeadline?: string;
  allowLateSubmission: boolean;
  latePenalty?: number;
  autoGrade: boolean;
  requireFile: boolean;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  attachments?: Array<{
    url: string;
    name: string;
    type: string;
    size: number;
  }>;
  createdById: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Computed fields (if included)
  submissionCount?: number;
  userSubmission?: ClubAssignmentSubmission;
}

export interface ClubAssignmentSubmission {
  id: string;
  assignmentId: string;
  assignment?: ClubAssignment;
  memberId: string;
  member?: {
    id: string;
    userId: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      profilePictureUrl?: string;
    };
  };
  status: SubmissionStatus;
  content?: string;
  attachments?: Array<{
    url: string;
    name: string;
    type: string;
    size: number;
  }>;
  submittedAt: string;
  isLate: boolean;
  score?: number;
  feedback?: string;
  gradedAt?: string;
  gradedById?: string;
  gradedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  attemptNumber: number;
  previousSubmissionId?: string;
}

export interface AssignmentStatistics {
  totalStudents: number;
  submittedCount: number;
  lateCount: number;
  gradedCount: number;
  averageScore?: number;
  maxScore?: number;
  minScore?: number;
}

export interface CreateAssignmentData {
  clubId: string;
  subjectId?: string;
  title: string;
  description?: string;
  instructions?: string;
  type: AssignmentType;
  status?: AssignmentStatus;
  maxPoints: number;
  weight?: number;
  dueDate: string;
  lateDeadline?: string;
  allowLateSubmission?: boolean;
  latePenalty?: number;
  autoGrade?: boolean;
  requireFile?: boolean;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  attachments?: Array<{
    url: string;
    name: string;
    type: string;
    size: number;
  }>;
}

export interface UpdateAssignmentData {
  title?: string;
  description?: string;
  instructions?: string;
  type?: AssignmentType;
  maxPoints?: number;
  weight?: number;
  dueDate?: string;
  lateDeadline?: string;
  allowLateSubmission?: boolean;
  latePenalty?: number;
  requireFile?: boolean;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  attachments?: Array<{
    url: string;
    name: string;
    type: string;
    size: number;
  }>;
}

export interface SubmitAssignmentData {
  content?: string;
  attachments?: Array<{
    url: string;
    name: string;
    type: string;
    size: number;
  }>;
}

export interface GradeSubmissionData {
  score: number;
  feedback?: string;
}

const normalizeAssignment = (payload: any): ClubAssignment => {
  const submissionCount = Number(
    payload?.submissionCount ?? payload?._count?.submissions ?? 0
  );
  const userSubmissionPayload =
    payload?.userSubmission ??
    (Array.isArray(payload?.submissions) ? payload.submissions[0] : undefined);

  return {
    ...(payload || {}),
    submissionCount,
    userSubmission: userSubmissionPayload
      ? normalizeSubmission(userSubmissionPayload)
      : undefined,
  };
};

const normalizeSubmission = (payload: any): ClubAssignmentSubmission => {
  const assignmentPayload = payload?.assignment
    ? normalizeAssignment(payload.assignment)
    : undefined;

  return {
    ...(payload || {}),
    assignment: assignmentPayload,
  };
};

const normalizeAssignmentStatistics = (payload: any): AssignmentStatistics => ({
  totalStudents: Number(payload?.totalStudents ?? 0),
  submittedCount: Number(payload?.submittedCount ?? payload?.submitted ?? 0),
  lateCount: Number(payload?.lateCount ?? payload?.late ?? 0),
  gradedCount: Number(payload?.gradedCount ?? payload?.graded ?? 0),
  averageScore:
    payload?.averageScore !== undefined ? Number(payload.averageScore) : undefined,
  maxScore: payload?.maxScore !== undefined ? Number(payload.maxScore) : undefined,
  minScore: payload?.minScore !== undefined ? Number(payload.minScore) : undefined,
});

const extractRows = (payload: any, keys: string[]): any[] => {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    const value = payload?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const extractEntity = (payload: any, keys: string[]): any => {
  for (const key of keys) {
    if (payload?.[key]) return payload[key];
  }
  return payload;
};

// ============================================================================
// Assignment API Functions
// ============================================================================

/**
 * Create a new assignment for a club
 */
export const createAssignment = async (data: CreateAssignmentData): Promise<ClubAssignment> => {
  const response = await api.post(`/assignments/clubs/${data.clubId}/assignments`, data);
  return normalizeAssignment(extractEntity(response.data, ['assignment', 'data']));
};

/**
 * Get all assignments for a club
 */
export const getClubAssignments = async (
  clubId: string,
  params?: {
    subjectId?: string;
    status?: AssignmentStatus;
    type?: AssignmentType;
  }
): Promise<ClubAssignment[]> => {
  const response = await api.get(`/assignments/clubs/${clubId}/assignments`, { params });
  const rows = extractRows(response.data, ['assignments', 'data']);
  return rows.map(normalizeAssignment);
};

/**
 * Get assignment by ID
 */
export const getAssignmentById = async (assignmentId: string): Promise<ClubAssignment> => {
  const response = await api.get(`/assignments/assignments/${assignmentId}`);
  return normalizeAssignment(extractEntity(response.data, ['assignment', 'data']));
};

/**
 * Update an assignment
 */
export const updateAssignment = async (
  assignmentId: string,
  data: UpdateAssignmentData
): Promise<ClubAssignment> => {
  const response = await api.put(`/assignments/assignments/${assignmentId}`, data);
  return normalizeAssignment(extractEntity(response.data, ['assignment', 'data']));
};

/**
 * Delete an assignment
 */
export const deleteAssignment = async (assignmentId: string): Promise<void> => {
  await api.delete(`/assignments/assignments/${assignmentId}`);
};

/**
 * Publish an assignment (make it visible to students)
 */
export const publishAssignment = async (assignmentId: string): Promise<ClubAssignment> => {
  const response = await api.post(`/assignments/assignments/${assignmentId}/publish`);
  return normalizeAssignment(extractEntity(response.data, ['assignment', 'data']));
};

/**
 * Get assignment statistics (submission stats)
 */
export const getAssignmentStatistics = async (
  assignmentId: string
): Promise<AssignmentStatistics> => {
  const response = await api.get(`/assignments/assignments/${assignmentId}/statistics`);
  return normalizeAssignmentStatistics(extractEntity(response.data, ['statistics', 'data']));
};

// ============================================================================
// Submission API Functions
// ============================================================================

/**
 * Submit an assignment
 */
export const submitAssignment = async (
  assignmentId: string,
  data: SubmitAssignmentData
): Promise<ClubAssignmentSubmission> => {
  const response = await api.post(`/submissions/assignments/${assignmentId}/submit`, data);
  return normalizeSubmission(extractEntity(response.data, ['submission', 'data']));
};

/**
 * Get all submissions for an assignment (instructor only)
 */
export const getAssignmentSubmissions = async (
  assignmentId: string
): Promise<ClubAssignmentSubmission[]> => {
  const response = await api.get(`/submissions/assignments/${assignmentId}/submissions`);
  const rows = extractRows(response.data, ['submissions', 'data']);
  return rows.map(normalizeSubmission);
};

/**
 * Get a member's submissions for a club
 */
export const getMemberSubmissions = async (
  clubId: string,
  memberId: string
): Promise<ClubAssignmentSubmission[]> => {
  const response = await api.get(`/submissions/clubs/${clubId}/members/${memberId}/submissions`);
  const rows = extractRows(response.data, ['submissions', 'data']);
  return rows.map(normalizeSubmission);
};

/**
 * Get submission by ID
 */
export const getSubmissionById = async (submissionId: string): Promise<ClubAssignmentSubmission> => {
  const response = await api.get(`/submissions/submissions/${submissionId}`);
  return normalizeSubmission(extractEntity(response.data, ['submission', 'data']));
};

/**
 * Grade a submission
 */
export const gradeSubmission = async (
  submissionId: string,
  data: GradeSubmissionData
): Promise<ClubAssignmentSubmission> => {
  const response = await api.put(`/submissions/submissions/${submissionId}/grade`, data);
  return normalizeSubmission(extractEntity(response.data, ['submission', 'data']));
};

/**
 * Delete a submission
 */
export const deleteSubmission = async (submissionId: string): Promise<void> => {
  await api.delete(`/submissions/submissions/${submissionId}`);
};
