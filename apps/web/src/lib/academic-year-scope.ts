import type { AcademicYear } from '@/lib/api/academic-years';

const LEGACY_SELECTED_YEAR_KEY = 'selectedAcademicYearId';
const SELECTED_YEAR_KEY_PREFIX = 'selectedAcademicYearId:';

export const ACADEMIC_YEAR_CHANGED_EVENT = 'stunity:academic-year-changed';
export const BEFORE_ACADEMIC_YEAR_CHANGE_EVENT = 'stunity:before-academic-year-change';
export const SCHOOL_CONTEXT_CHANGED_EVENT = 'stunity:school-context-changed';

export type AcademicYearMode = 'operational' | 'planning' | 'historical';

export function selectedAcademicYearStorageKey(schoolId: string): string {
  return `${SELECTED_YEAR_KEY_PREFIX}${schoolId}`;
}

export function readSelectedAcademicYearId(schoolId?: string | null): string | null {
  if (typeof window === 'undefined' || !schoolId) return null;
  return (
    localStorage.getItem(selectedAcademicYearStorageKey(schoolId)) ||
    localStorage.getItem(LEGACY_SELECTED_YEAR_KEY)
  );
}

export function persistSelectedAcademicYearId(schoolId: string, academicYearId: string): void {
  if (typeof window === 'undefined') return;

  // The school-scoped key is authoritative. The legacy key is mirrored while
  // older pages are migrated so they cannot silently select a different year.
  localStorage.setItem(selectedAcademicYearStorageKey(schoolId), academicYearId);
  localStorage.setItem(LEGACY_SELECTED_YEAR_KEY, academicYearId);
  window.dispatchEvent(
    new CustomEvent(ACADEMIC_YEAR_CHANGED_EVENT, {
      detail: { schoolId, academicYearId },
    }),
  );
}

export function getAcademicYearMode(year?: AcademicYear | null): AcademicYearMode {
  if (!year || year.status === 'ENDED' || year.status === 'ARCHIVED') return 'historical';
  if (year.status === 'PLANNING') return 'planning';
  return year.isCurrent ? 'operational' : 'historical';
}

/** Operational records are editable only in the one active/current school year. */
export function canWriteOperationalAcademicData(year?: AcademicYear | null): boolean {
  return getAcademicYearMode(year) === 'operational';
}

export function isDateInsideAcademicYear(
  value: string | Date,
  year?: Pick<AcademicYear, 'startDate' | 'endDate'> | null,
): boolean {
  if (!year) return false;
  const date = new Date(value);
  const start = new Date(year.startDate);
  const end = new Date(year.endDate);
  if ([date, start, end].some((item) => Number.isNaN(item.getTime()))) return false;

  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const firstDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const lastDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return day >= firstDay && day <= lastDay;
}
