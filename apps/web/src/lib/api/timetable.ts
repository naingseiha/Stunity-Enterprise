import { TokenManager } from './auth';

const TIMETABLE_SERVICE_URL = process.env.NEXT_PUBLIC_TIMETABLE_SERVICE_URL || 'http://localhost:3009';

// Types
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface Period {
  id: string;
  schoolId: string;
  name: string;
  startTime: string;
  endTime: string;
  order: number;
  isBreak: boolean;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableEntry {
  id: string;
  schoolId: string;
  classId: string;
  subjectId: string | null;
  teacherId: string | null;
  periodId: string;
  dayOfWeek: DayOfWeek;
  room: string | null;
  academicYearId: string;
  subject?: {
    id: string;
    name: string;
    nameKh: string;
    code: string;
    category: string;
  };
  teacher?: {
    id: string;
    firstName: string;
    lastName: string;
    khmerName?: string;
  };
  period?: Period;
  class?: {
    id: string;
    name: string;
    grade: string;
  };
}

export interface TimetableGrid {
  [day: string]: {
    [periodId: string]: TimetableEntry | null;
  };
}

export interface ClassTimetable {
  class: {
    id: string;
    name: string;
    grade: string;
    academicYear: {
      id: string;
      name: string;
    };
  };
  periods: Period[];
  entries: TimetableEntry[];
  grid: TimetableGrid;
  days: DayOfWeek[];
}

export interface TeacherSchedule {
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    khmerName?: string;
  };
  periods: Period[];
  entries: TimetableEntry[];
  grid: TimetableGrid;
  days: DayOfWeek[];
  totalPeriods: number;
}

export interface TimetableStats {
  totalEntries: number;
  totalPeriods: number;
  totalClasses: number;
  totalTeachers: number;
  totalSlots: number;
  coverage: number;
  entriesByDay: Array<{ day: DayOfWeek; count: number }>;
}

export interface Conflict {
  type: 'CLASS_CONFLICT' | 'TEACHER_CONFLICT';
  message: string;
  entry?: TimetableEntry;
}

// Day labels for display
export const DAY_LABELS: Record<DayOfWeek, { en: string; kh: string; short: string }> = {
  MONDAY: { en: 'Monday', kh: 'ច័ន្ទ', short: 'Mon' },
  TUESDAY: { en: 'Tuesday', kh: 'អង្គារ', short: 'Tue' },
  WEDNESDAY: { en: 'Wednesday', kh: 'ពុធ', short: 'Wed' },
  THURSDAY: { en: 'Thursday', kh: 'ព្រហស្បតិ៍', short: 'Thu' },
  FRIDAY: { en: 'Friday', kh: 'សុក្រ', short: 'Fri' },
  SATURDAY: { en: 'Saturday', kh: 'សៅរ៍', short: 'Sat' },
  SUNDAY: { en: 'Sunday', kh: 'អាទិត្យ', short: 'Sun' },
};

// Subject category colors for timetable cells
export const CATEGORY_COLORS: Record<string, string> = {
  'Languages': 'bg-blue-100 border-blue-300 text-blue-800',
  'Mathematics': 'bg-green-100 border-green-300 text-green-800',
  'Sciences': 'bg-purple-100 border-purple-300 text-purple-800',
  'Social Sciences': 'bg-yellow-100 border-yellow-300 text-yellow-800',
  'Arts & Culture': 'bg-pink-100 border-pink-300 text-pink-800',
  'Physical Education': 'bg-orange-100 border-orange-300 text-orange-800',
  'Technology': 'bg-cyan-100 border-cyan-300 text-cyan-800',
  'default': 'bg-gray-100 border-gray-300 text-gray-800',
};

export function getCategoryColor(category?: string): string {
  if (!category) return CATEGORY_COLORS.default;
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
}

// Helper to make authenticated requests
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const tokens = TokenManager.getTokens();
  if (!tokens?.accessToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Period API
export const periodAPI = {
  // Get all periods
  async list(): Promise<{ data: { periods: Period[] } }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/periods`);
  },

  // Create a period
  async create(data: Omit<Period, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>): Promise<{ data: Period }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/periods`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Create default periods (Cambodian schedule)
  async createDefaults(): Promise<{ data: { periods: Period[]; count: number } }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/periods/bulk`, {
      method: 'POST',
    });
  },

  // Update a period
  async update(id: string, data: Partial<Period>): Promise<{ data: Period }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/periods/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete a period
  async delete(id: string): Promise<{ message: string }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/periods/${id}`, {
      method: 'DELETE',
    });
  },
};

// Timetable API
export const timetableAPI = {
  // Get class timetable
  async getClassTimetable(classId: string, academicYearId?: string): Promise<{ data: ClassTimetable }> {
    const params = academicYearId ? `?academicYearId=${academicYearId}` : '';
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/timetable/class/${classId}${params}`);
  },

  // Get teacher schedule
  async getTeacherSchedule(teacherId: string, academicYearId?: string): Promise<{ data: TeacherSchedule }> {
    const params = academicYearId ? `?academicYearId=${academicYearId}` : '';
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/timetable/teacher/${teacherId}${params}`);
  },

  // Create timetable entry
  async createEntry(data: {
    classId: string;
    subjectId?: string;
    teacherId?: string;
    periodId: string;
    dayOfWeek: DayOfWeek;
    room?: string;
    academicYearId: string;
  }): Promise<{ data: TimetableEntry }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/timetable/entry`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update timetable entry
  async updateEntry(
    id: string,
    data: {
      subjectId?: string;
      teacherId?: string;
      room?: string;
    }
  ): Promise<{ data: TimetableEntry }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/timetable/entry/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete timetable entry
  async deleteEntry(id: string): Promise<{ message: string }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/timetable/entry/${id}`, {
      method: 'DELETE',
    });
  },

  // Check for conflicts
  async checkConflicts(data: {
    classId: string;
    teacherId?: string;
    periodId: string;
    dayOfWeek: DayOfWeek;
    academicYearId: string;
  }): Promise<{ data: { hasConflicts: boolean; conflicts: Conflict[] } }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/timetable/check-conflicts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Bulk create entries
  async bulkCreate(
    entries: Array<{
      classId: string;
      subjectId?: string;
      teacherId?: string;
      periodId: string;
      dayOfWeek: DayOfWeek;
      room?: string;
    }>,
    academicYearId: string,
    clearExisting?: boolean
  ): Promise<{ data: { created: number } }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/timetable/bulk-create`, {
      method: 'POST',
      body: JSON.stringify({ entries, academicYearId, clearExisting }),
    });
  },

  // Get statistics
  async getStats(academicYearId?: string): Promise<{ data: TimetableStats }> {
    const params = academicYearId ? `?academicYearId=${academicYearId}` : '';
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/timetable/stats${params}`);
  },

  // Auto-assign teachers to class timetable
  async autoAssign(
    classId: string,
    academicYearId: string,
    options?: {
      respectTeacherPreferences?: boolean;
      balanceWorkload?: boolean;
      clearExisting?: boolean;
    }
  ): Promise<{
    data: {
      assignedCount: number;
      unassignedCount: number;
      unassignedSlots: Array<{ day: DayOfWeek; periodId: string; periodName: string }>;
      subjectCoverage: Array<{
        subjectId: string;
        subjectName: string;
        required: number;
        assigned: number;
      }>;
    };
  }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/timetable/auto-assign`, {
      method: 'POST',
      body: JSON.stringify({ classId, academicYearId, options }),
    });
  },

  // Get available teachers for a slot
  async getAvailableTeachers(params: {
    periodId: string;
    dayOfWeek: DayOfWeek;
    academicYearId: string;
    subjectId?: string;
  }): Promise<{
    data: {
      teachers: Array<{
        id: string;
        firstName: string;
        lastName: string;
        khmerName?: string;
        isBusy: boolean;
        busyWith?: string;
        currentWorkload: number;
        subjects: Array<{ id: string; name: string; isPrimary: boolean }>;
        canTeachSubject: boolean;
        available: boolean;
      }>;
    };
  }> {
    const query = new URLSearchParams({
      periodId: params.periodId,
      dayOfWeek: params.dayOfWeek,
      academicYearId: params.academicYearId,
      ...(params.subjectId && { subjectId: params.subjectId }),
    }).toString();
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/timetable/available-teachers?${query}`);
  },

  // Move entry to new slot
  async moveEntry(
    entryId: string,
    newPeriodId: string,
    newDayOfWeek: DayOfWeek
  ): Promise<{ data: TimetableEntry }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/timetable/move`, {
      method: 'POST',
      body: JSON.stringify({ entryId, newPeriodId, newDayOfWeek }),
    });
  },

  // Move entry using period number
  async moveEntryByPeriod(
    entryId: string,
    newDayOfWeek: DayOfWeek,
    newPeriodNumber: number
  ): Promise<{ data: TimetableEntry }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/timetable/move-entry`, {
      method: 'POST',
      body: JSON.stringify({ entryId, newDayOfWeek, newPeriodNumber }),
    });
  },

  // Create entry using period number
  async createEntryByPeriod(data: {
    classId: string;
    subjectId?: string;
    teacherId?: string;
    periodNumber: number;
    dayOfWeek: DayOfWeek;
    room?: string;
    academicYearId: string;
  }): Promise<{ data: TimetableEntry }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/timetable/entry-by-period`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get teacher availability for a time slot
  async getTeacherAvailability(params: {
    dayOfWeek: DayOfWeek;
    periodNumber: number;
    academicYearId: string;
  }): Promise<{
    data: {
      busyTeachers: string[];
      teacherBusyInfo: Record<string, string>;
      totalTeachers: number;
      availableCount: number;
    };
  }> {
    const query = new URLSearchParams({
      dayOfWeek: params.dayOfWeek,
      periodNumber: params.periodNumber.toString(),
      academicYearId: params.academicYearId,
    }).toString();
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/timetable/teacher-availability?${query}`);
  },

  // Get master timetable stats
  async getMasterStats(academicYearId: string): Promise<{
    data: {
      totalClasses: number;
      totalSlots: number;
      filledSlots: number;
      coverage: number;
      secondary: {
        classes: number;
        slots: number;
        filled: number;
        coverage: number;
      };
      highSchool: {
        classes: number;
        slots: number;
        filled: number;
        coverage: number;
      };
      teacherStats: {
        total: number;
        avgHoursPerTeacher: number;
      };
    };
  }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/timetable/master-stats?academicYearId=${academicYearId}`);
  },

  // Get all teacher workloads
  async getAllTeacherWorkloads(academicYearId: string): Promise<{
    data: {
      teachers: Array<{
        id: string;
        firstName?: string;
        lastName?: string;
        firstNameLatin?: string;
        lastNameLatin?: string;
        khmerName?: string;
        totalHoursAssigned: number;
        maxHoursPerWeek: number;
      }>;
    };
  }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/timetable/all-teacher-workloads?academicYearId=${academicYearId}`);
  },

  // Swap two entries
  async swapEntries(
    entryId1: string,
    entryId2: string
  ): Promise<{ data: { entry1: TimetableEntry; entry2: TimetableEntry } }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/timetable/swap`, {
      method: 'POST',
      body: JSON.stringify({ entryId1, entryId2 }),
    });
  },

  // Get all classes with timetable stats
  async getAllClasses(
    academicYearId: string,
    gradeLevel?: 'SECONDARY' | 'HIGH_SCHOOL'
  ): Promise<{
    data: {
      classes: Array<{
        id: string;
        name: string;
        grade: string;
        section?: string;
        entryCount: number;
        totalSlots: number;
        coverage: number;
      }>;
    };
  }> {
    const params = new URLSearchParams({ academicYearId });
    if (gradeLevel) params.append('gradeLevel', gradeLevel);
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/timetable/all-classes?${params}`);
  },

  // Publish timetable
  async publish(data: {
    academicYearId: string;
    notifyTeachers?: boolean;
    notifyClasses?: boolean;
    notes?: string;
  }): Promise<{ data: any }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/timetable/publish`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ========================================
// Shift API
// ========================================

export interface SchoolShift {
  id: string;
  schoolId: string;
  name: string;
  nameKh?: string;
  startTime: string;
  endTime: string;
  isDefault: boolean;
  gradeLevel?: 'PRIMARY' | 'SECONDARY' | 'HIGH_SCHOOL';
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassShift {
  id: string;
  classId: string;
  shiftId: string;
  shift?: SchoolShift;
}

export interface ClassShiftOverride {
  id: string;
  classId: string;
  dayOfWeek: DayOfWeek;
  shiftId: string;
  shift?: SchoolShift;
}

export const shiftAPI = {
  // Get all shifts
  async list(): Promise<{ data: { shifts: SchoolShift[] } }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/shifts`);
  },

  // Create default shifts
  async createDefaults(): Promise<{ data: { shifts: SchoolShift[]; count: number } }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/shifts/defaults`, {
      method: 'POST',
    });
  },

  // Create a shift
  async create(data: Omit<SchoolShift, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>): Promise<{ data: SchoolShift }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/shifts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update a shift
  async update(id: string, data: Partial<SchoolShift>): Promise<{ data: SchoolShift }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/shifts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete a shift
  async delete(id: string): Promise<{ message: string }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/shifts/${id}`, {
      method: 'DELETE',
    });
  },

  // Assign shift to class
  async assignToClass(classId: string, shiftId: string): Promise<{ data: ClassShift }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/shifts/assign-class`, {
      method: 'POST',
      body: JSON.stringify({ classId, shiftId }),
    });
  },

  // Override shift for specific day
  async createOverride(classId: string, dayOfWeek: DayOfWeek, shiftId: string): Promise<{ data: ClassShiftOverride }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/shifts/override`, {
      method: 'POST',
      body: JSON.stringify({ classId, dayOfWeek, shiftId }),
    });
  },

  // Get class shift info
  async getClassShift(classId: string): Promise<{
    data: { classShift: ClassShift | null; overrides: ClassShiftOverride[] };
  }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/shifts/class/${classId}`);
  },
};

// ========================================
// Teacher Subject Assignment API
// ========================================

export interface TeacherSubjectAssignment {
  id: string;
  teacherId: string;
  subjectId: string;
  isPrimary: boolean;
  maxPeriodsPerWeek: number;
  preferredGrades: string[];
  isActive: boolean;
  teacher?: {
    id: string;
    firstName: string;
    lastName: string;
    khmerName?: string;
  };
  subject?: {
    id: string;
    name: string;
    nameKh: string;
    code: string;
    category: string;
  };
}

export const teacherSubjectAPI = {
  // Get all assignments
  async list(): Promise<{ data: { assignments: TeacherSubjectAssignment[] } }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/teacher-subjects`);
  },

  // Get assignments for a teacher
  async getByTeacher(teacherId: string): Promise<{ data: { assignments: TeacherSubjectAssignment[] } }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/teacher-subjects/${teacherId}`);
  },

  // Assign subject to teacher
  async assign(data: {
    teacherId: string;
    subjectId: string;
    isPrimary?: boolean;
    maxPeriodsPerWeek?: number;
    preferredGrades?: string[];
  }): Promise<{ data: TeacherSubjectAssignment }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/teacher-subjects`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Remove assignment
  async remove(teacherId: string, subjectId: string): Promise<{ message: string }> {
    return fetchWithAuth(`${TIMETABLE_SERVICE_URL}/teacher-subjects/${teacherId}/${subjectId}`, {
      method: 'DELETE',
    });
  },
};
