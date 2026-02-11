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

// ============================================================================
// Assignment API Functions
// ============================================================================

/**
 * Create a new assignment for a club
 */
export const createAssignment = async (data: CreateAssignmentData): Promise<ClubAssignment> => {
  const response = await api.post(`/clubs/${data.clubId}/assignments`, data);
  return response.data;
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
  const response = await api.get(`/clubs/${clubId}/assignments`, { params });
  return response.data;
};

/**
 * Get assignment by ID
 */
export const getAssignmentById = async (assignmentId: string): Promise<ClubAssignment> => {
  const response = await api.get(`/assignments/${assignmentId}`);
  return response.data;
};

/**
 * Update an assignment
 */
export const updateAssignment = async (
  assignmentId: string,
  data: UpdateAssignmentData
): Promise<ClubAssignment> => {
  const response = await api.put(`/assignments/${assignmentId}`, data);
  return response.data;
};

/**
 * Delete an assignment
 */
export const deleteAssignment = async (assignmentId: string): Promise<void> => {
  await api.delete(`/assignments/${assignmentId}`);
};

/**
 * Publish an assignment (make it visible to students)
 */
export const publishAssignment = async (assignmentId: string): Promise<ClubAssignment> => {
  const response = await api.post(`/assignments/${assignmentId}/publish`);
  return response.data;
};

/**
 * Get assignment statistics (submission stats)
 */
export const getAssignmentStatistics = async (
  assignmentId: string
): Promise<AssignmentStatistics> => {
  const response = await api.get(`/assignments/${assignmentId}/statistics`);
  return response.data;
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
  const response = await api.post(`/assignments/${assignmentId}/submit`, data);
  return response.data;
};

/**
 * Get all submissions for an assignment (instructor only)
 */
export const getAssignmentSubmissions = async (
  assignmentId: string
): Promise<ClubAssignmentSubmission[]> => {
  const response = await api.get(`/assignments/${assignmentId}/submissions`);
  return response.data;
};

/**
 * Get a member's submissions for a club
 */
export const getMemberSubmissions = async (
  clubId: string,
  memberId: string
): Promise<ClubAssignmentSubmission[]> => {
  const response = await api.get(`/clubs/${clubId}/members/${memberId}/submissions`);
  return response.data;
};

/**
 * Get submission by ID
 */
export const getSubmissionById = async (submissionId: string): Promise<ClubAssignmentSubmission> => {
  const response = await api.get(`/submissions/${submissionId}`);
  return response.data;
};

/**
 * Grade a submission
 */
export const gradeSubmission = async (
  submissionId: string,
  data: GradeSubmissionData
): Promise<ClubAssignmentSubmission> => {
  const response = await api.put(`/submissions/${submissionId}/grade`, data);
  return response.data;
};

/**
 * Delete a submission
 */
export const deleteSubmission = async (submissionId: string): Promise<void> => {
  await api.delete(`/submissions/${submissionId}`);
};
