import type { MyClassSummary } from '@/api/classes';

/**
 * Loose shape for directory / admin class rows: `/classes` returns Prisma-shaped
 * `_count.studentClasses` and optional `studentClasses[]` while `/classes/my` flattens `studentCount`.
 */
export type ClassDirectoryCardItem = Partial<Pick<MyClassSummary, 'studentCount'>> &
  Pick<MyClassSummary, 'id' | 'name' | 'grade'> & {
    maleCount?: unknown;
    femaleCount?: unknown;
    _count?: { studentClasses?: unknown };
    studentClasses?: Array<{ student?: { gender?: string | null } | null }>;
  };

function parseOptionalNonNegativeInt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.floor(n));
}

/**
 * Resolves roster size for cards. Handles:
 * - `/classes/my` flattened `studentCount`
 * - Full `/classes` payload: `_count.studentClasses` or `studentClasses.length`
 */
export function getSafeStudentCount(item: ClassDirectoryCardItem): number {
  if (item.studentCount !== undefined && item.studentCount !== null) {
    return parseOptionalNonNegativeInt(item.studentCount) ?? 0;
  }
  const nested = parseOptionalNonNegativeInt(item._count?.studentClasses);
  if (nested !== null) return nested;
  if (Array.isArray(item.studentClasses)) return item.studentClasses.length;
  return 0;
}

function rosterGenderCounts(item: ClassDirectoryCardItem): { male: number; female: number } | null {
  const rows = item.studentClasses;
  if (!Array.isArray(rows) || rows.length === 0) return null;

  let male = 0;
  let female = 0;
  let unknown = 0;

  for (const row of rows) {
    const g = String(row?.student?.gender ?? '')
      .trim()
      .toUpperCase();
    if (g === 'MALE') male++;
    else if (g === 'FEMALE') female++;
    else unknown++;
  }

  if (unknown > 0) {
    male += Math.floor(unknown * 0.45);
    female += unknown - Math.floor(unknown * 0.45);
  }

  return { male, female };
}

/**
 * Derives male/female counts for directory cards. Never returns NaN.
 */
export function getClassGenderCounts(item: ClassDirectoryCardItem): { male: number; female: number } {
  const total = getSafeStudentCount(item);
  const maleRaw = parseOptionalNonNegativeInt(item.maleCount);
  const femaleRaw = parseOptionalNonNegativeInt(item.femaleCount);

  if (maleRaw !== null && femaleRaw !== null) {
    return { male: maleRaw, female: femaleRaw };
  }
  if (maleRaw !== null) {
    return { male: maleRaw, female: Math.max(0, total - maleRaw) };
  }
  if (femaleRaw !== null) {
    return { male: Math.max(0, total - femaleRaw), female: femaleRaw };
  }

  const fromRoster = rosterGenderCounts(item);
  if (fromRoster && total > 0) {
    let { male, female } = fromRoster;
    const sum = male + female;
    if (sum !== total && sum > 0) {
      male = Math.round((male / sum) * total);
      female = total - male;
    }
    if (sum === 0) {
      male = Math.floor(total * 0.45);
      female = total - male;
    }
    return { male, female };
  }

  const male = Math.floor(total * 0.45);
  return { male, female: Math.max(0, total - male) };
}
