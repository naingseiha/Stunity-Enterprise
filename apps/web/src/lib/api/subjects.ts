import { TokenManager } from './auth';

const API_BASE_URL = 'http://localhost:3006';

export interface Subject {
  id: string;
  name: string;
  nameKh: string;
  nameEn?: string;
  code: string;
  description?: string;
  grade: string;
  track?: string;
  category: string;
  weeklyHours: number;
  annualHours: number;
  maxScore: number;
  coefficient: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  subjectTeachers?: SubjectTeacher[];
  _count?: {
    grades: number;
    subjectTeachers: number;
  };
}

export interface SubjectTeacher {
  id: string;
  subjectId: string;
  teacherId: string;
  teacher: {
    id: string;
    teacherId?: string;
    firstName: string;
    lastName: string;
    khmerName?: string;
    email?: string;
    phone: string;
    photoUrl?: string;
  };
  createdAt: string;
}

export interface SubjectStatistics {
  total: number;
  active: number;
  inactive: number;
  byGrade: Array<{ grade: string; _count: number }>;
  byCategory: Array<{ category: string; _count: number }>;
  byTrack: Array<{ track: string | null; _count: number }>;
}

export interface SubjectFilters {
  grade?: string;
  track?: string;
  category?: string;
  isActive?: boolean;
  search?: string;
  includeTeachers?: boolean;
}

/**
 * Subject API Client
 */
class SubjectAPI {
  private getHeaders() {
    const token = TokenManager.getAccessToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Get all subjects with optional filters
   */
  async getSubjects(filters?: SubjectFilters): Promise<Subject[]> {
    const params = new URLSearchParams();
    
    if (filters?.grade) params.append('grade', filters.grade);
    if (filters?.track) params.append('track', filters.track);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.search) params.append('search', filters.search);
    if (filters?.includeTeachers) params.append('includeTeachers', 'true');

    const url = `${API_BASE_URL}/subjects${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch subjects');
    }

    return response.json();
  }

  /**
   * Get lightweight subjects (for dropdowns)
   */
  async getSubjectsLightweight(grade?: string, isActive: boolean = true): Promise<Subject[]> {
    const params = new URLSearchParams();
    if (grade) params.append('grade', grade);
    params.append('isActive', String(isActive));

    const url = `${API_BASE_URL}/subjects/lightweight?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch subjects');
    }

    return response.json();
  }

  /**
   * Get single subject by ID
   */
  async getSubject(id: string): Promise<Subject> {
    const response = await fetch(`${API_BASE_URL}/subjects/${id}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch subject');
    }

    return response.json();
  }

  /**
   * Create new subject
   */
  async createSubject(data: Partial<Subject>): Promise<Subject> {
    const response = await fetch(`${API_BASE_URL}/subjects`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create subject');
    }

    return response.json();
  }

  /**
   * Update subject
   */
  async updateSubject(id: string, data: Partial<Subject>): Promise<Subject> {
    const response = await fetch(`${API_BASE_URL}/subjects/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update subject');
    }

    return response.json();
  }

  /**
   * Delete subject
   */
  async deleteSubject(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/subjects/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete subject');
    }
  }

  /**
   * Toggle subject active status
   */
  async toggleStatus(id: string): Promise<Subject> {
    const response = await fetch(`${API_BASE_URL}/subjects/${id}/toggle-status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to toggle subject status');
    }

    return response.json();
  }

  /**
   * Assign teacher to subject
   */
  async assignTeacher(subjectId: string, teacherId: string): Promise<SubjectTeacher> {
    const response = await fetch(`${API_BASE_URL}/subjects/${subjectId}/teachers`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ teacherId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to assign teacher');
    }

    return response.json();
  }

  /**
   * Remove teacher from subject
   */
  async removeTeacher(subjectId: string, teacherId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/subjects/${subjectId}/teachers/${teacherId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to remove teacher');
    }
  }

  /**
   * Get teachers assigned to subject
   */
  async getSubjectTeachers(subjectId: string): Promise<SubjectTeacher[]> {
    const response = await fetch(`${API_BASE_URL}/subjects/${subjectId}/teachers`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch subject teachers');
    }

    return response.json();
  }

  /**
   * Get subjects by grade
   */
  async getSubjectsByGrade(grade: string, track?: string): Promise<Subject[]> {
    const params = new URLSearchParams();
    if (track) params.append('track', track);

    const url = `${API_BASE_URL}/subjects/by-grade/${grade}${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch subjects by grade');
    }

    return response.json();
  }

  /**
   * Get subjects by teacher
   */
  async getSubjectsByTeacher(teacherId: string): Promise<Subject[]> {
    const response = await fetch(`${API_BASE_URL}/subjects/by-teacher/${teacherId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch subjects by teacher');
    }

    return response.json();
  }

  /**
   * Get subject statistics
   */
  async getStatistics(): Promise<SubjectStatistics> {
    const response = await fetch(`${API_BASE_URL}/subjects/statistics`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch statistics');
    }

    return response.json();
  }

  /**
   * Bulk create subjects
   */
  async bulkCreate(subjects: Partial<Subject>[]): Promise<{ message: string; count: number }> {
    const response = await fetch(`${API_BASE_URL}/subjects/bulk-create`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ subjects }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to bulk create subjects');
    }

    return response.json();
  }
}

export const subjectAPI = new SubjectAPI();
