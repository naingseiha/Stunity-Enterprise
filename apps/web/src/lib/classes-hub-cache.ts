/**
 * Classes hub cache — native classes hydrate/prefetch parity for web/PWA.
 */

import {
  classesHubApi,
  MyClassSummary,
  HubStats,
  ClassStudent,
} from "@/lib/api/classesHub";

export type ClassesHubCachePayload = {
  myClasses: MyClassSummary[];
  directory: MyClassSummary[];
  selectedClassId: string | null;
  stats: HubStats | null;
  academicYearId: string | null;
};

export type ClassDetailCachePayload = {
  students: ClassStudent[];
  attendancePct: number;
  studentStats: { total: number; male: number; female: number };
};

type CacheEntry<T> = { data: T; cachedAt: number };

const MEMORY = new Map<string, CacheEntry<ClassesHubCachePayload>>();
const DETAIL_MEMORY = new Map<string, CacheEntry<ClassDetailCachePayload>>();
const IN_FLIGHT = new Map<string, Promise<ClassesHubCachePayload | null>>();
const DETAIL_IN_FLIGHT = new Map<string, Promise<ClassDetailCachePayload | null>>();

const FRESH_MS = 60_000;
const STALE_MS = 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = "stunity:classes-hub:v1:";
const DETAIL_PREFIX = "stunity:class-detail:v1:";

function hubScopeKey(userId: string, academicYearId?: string | null) {
  return `${userId}:${academicYearId || "current"}`;
}
function hubKey(userId: string, academicYearId?: string | null) {
  return `${STORAGE_PREFIX}${hubScopeKey(userId, academicYearId)}`;
}
function detailKey(userId: string, classId: string) {
  return `${DETAIL_PREFIX}${userId}:${classId}`;
}

function readDisk<T>(key: string): CacheEntry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed?.data || typeof parsed.cachedAt !== "number") return null;
    if (Date.now() - parsed.cachedAt > STALE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeDisk<T>(key: string, entry: CacheEntry<T>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    /* quota */
  }
}

export function readClassesHubCache(userId: string, academicYearId?: string | null): ClassesHubCachePayload | null {
  if (!userId) return null;
  const scopeKey = hubScopeKey(userId, academicYearId);
  const mem = MEMORY.get(scopeKey);
  if (mem?.data) return mem.data;
  const disk = readDisk<ClassesHubCachePayload>(hubKey(userId, academicYearId));
  if (disk?.data) {
    MEMORY.set(scopeKey, disk);
    return disk.data;
  }
  return null;
}

export function isClassesHubCacheFresh(userId: string, academicYearId?: string | null, now = Date.now()): boolean {
  if (!userId) return false;
  const scopeKey = hubScopeKey(userId, academicYearId);
  const mem = MEMORY.get(scopeKey);
  if (mem) return now - mem.cachedAt < FRESH_MS;
  const disk = readDisk<ClassesHubCachePayload>(hubKey(userId, academicYearId));
  if (!disk) return false;
  MEMORY.set(scopeKey, disk);
  return now - disk.cachedAt < FRESH_MS;
}

export function writeClassesHubCache(userId: string, data: ClassesHubCachePayload, academicYearId?: string | null): void {
  if (!userId) return;
  const entry = { data, cachedAt: Date.now() };
  MEMORY.set(hubScopeKey(userId, academicYearId), entry);
  writeDisk(hubKey(userId, academicYearId), entry);
}

export function readClassDetailCache(
  userId: string,
  classId: string
): ClassDetailCachePayload | null {
  if (!userId || !classId) return null;
  const key = `${userId}:${classId}`;
  const mem = DETAIL_MEMORY.get(key);
  if (mem?.data) return mem.data;
  const disk = readDisk<ClassDetailCachePayload>(detailKey(userId, classId));
  if (disk?.data) {
    DETAIL_MEMORY.set(key, disk);
    return disk.data;
  }
  return null;
}

export function writeClassDetailCache(
  userId: string,
  classId: string,
  data: ClassDetailCachePayload
): void {
  if (!userId || !classId) return;
  const key = `${userId}:${classId}`;
  const entry = { data, cachedAt: Date.now() };
  DETAIL_MEMORY.set(key, entry);
  writeDisk(detailKey(userId, classId), entry);
}

function genderCounts(students: ClassStudent[], fallbackTotal = 0) {
  let male = 0;
  let female = 0;
  students.forEach((s) => {
    const g = (s.gender || "").toUpperCase();
    if (g === "MALE" || g === "M") male++;
    else if (g === "FEMALE" || g === "F") female++;
  });
  return { total: students.length || fallbackTotal, male, female };
}

async function fetchHubNetwork(
  userId: string,
  role?: string,
  academicYearId?: string | null,
): Promise<ClassesHubCachePayload> {
  let yearId = academicYearId || null;
  if (!yearId) {
    const years = await classesHubApi.getAcademicYears();
    const currentYear = years.find((y) => y.isCurrent) || years[0];
    yearId = currentYear?.id || null;
  }

  const [myClasses, stats] = await Promise.all([
    classesHubApi.getMyClasses(yearId || undefined),
    classesHubApi.getStats(userId),
  ]);

  const roleUpper = (role || "").toUpperCase();
  const isAdminStaff =
    roleUpper === "ADMIN" ||
    roleUpper === "STAFF" ||
    roleUpper === "SCHOOL_ADMIN" ||
    roleUpper === "SUPER_ADMIN";

  let directory: MyClassSummary[] = [];
  if (myClasses.length === 0 && isAdminStaff) {
    directory = await classesHubApi.getClassesLightweight({
      academicYearId: yearId || undefined,
      limit: 100,
    });
  }

  const prev = readClassesHubCache(userId, yearId);
  // Teachers: prefer a class they actually teach (timetable assignment), like native ClubsScreen.
  const teachingFirst =
    roleUpper === "TEACHER"
      ? myClasses.filter((c) => c.hasTimetableAssignment === true)
      : [];
  const preferredDefault =
    (teachingFirst[0]?.id || myClasses[0]?.id) ?? null;
  const selectedClassId =
    (prev?.selectedClassId && myClasses.some((c) => c.id === prev.selectedClassId)
      ? prev.selectedClassId
      : null) || preferredDefault;

  return {
    myClasses,
    directory,
    selectedClassId,
    stats,
    academicYearId: yearId,
  };
}

export async function fetchClassesHub(options: {
  userId: string;
  role?: string;
  academicYearId?: string | null;
  force?: boolean;
}): Promise<ClassesHubCachePayload | null> {
  const { userId, role, academicYearId, force } = options;
  if (!userId) return null;
  const scopeKey = hubScopeKey(userId, academicYearId);

  if (!force && isClassesHubCacheFresh(userId, academicYearId)) {
    return readClassesHubCache(userId, academicYearId);
  }

  const existing = IN_FLIGHT.get(scopeKey);
  if (existing && !force) return existing;

  const cached = readClassesHubCache(userId, academicYearId);
  const request = fetchHubNetwork(userId, role, academicYearId)
    .then((payload) => {
      writeClassesHubCache(userId, payload, payload.academicYearId);
      return payload;
    })
    .catch(() => cached)
    .finally(() => {
      IN_FLIGHT.delete(scopeKey);
    });

  IN_FLIGHT.set(scopeKey, request);
  return request;
}

export async function fetchClassDetail(options: {
  userId: string;
  classId: string;
  fallbackStudentCount?: number;
  force?: boolean;
}): Promise<ClassDetailCachePayload | null> {
  const { userId, classId, fallbackStudentCount = 0, force } = options;
  if (!userId || !classId) return null;

  const key = `${userId}:${classId}`;
  if (!force) {
    const cached = readClassDetailCache(userId, classId);
    if (cached) {
      const mem = DETAIL_MEMORY.get(key);
      if (mem && Date.now() - mem.cachedAt < FRESH_MS) return cached;
    }
  }

  const existing = DETAIL_IN_FLIGHT.get(key);
  if (existing && !force) return existing;

  const request = (async () => {
    const [students, attendance] = await Promise.all([
      classesHubApi.getStudents(classId),
      classesHubApi.getAttendanceSummary(classId),
    ]);
    const studentStats = genderCounts(students, fallbackStudentCount);
    const rate = Number(attendance?.summary?.averageAttendanceRate ?? 100);
    const attendancePct = rate > 1 ? rate / 100 : rate;
    const payload: ClassDetailCachePayload = {
      students,
      attendancePct,
      studentStats,
    };
    writeClassDetailCache(userId, classId, payload);
    return payload;
  })()
    .catch(() => readClassDetailCache(userId, classId))
    .finally(() => {
      DETAIL_IN_FLIGHT.delete(key);
    });

  DETAIL_IN_FLIGHT.set(key, request);
  return request;
}

export function prefetchClassesHub(userId: string, role?: string, academicYearId?: string | null): void {
  if (!userId || typeof window === "undefined") return;
  if (isClassesHubCacheFresh(userId, academicYearId)) return;
  void fetchClassesHub({ userId, role, academicYearId });
}

export function prefetchClassDetail(
  userId: string,
  classId: string,
  fallbackStudentCount?: number
): void {
  if (!userId || !classId || typeof window === "undefined") return;
  const cached = readClassDetailCache(userId, classId);
  const mem = DETAIL_MEMORY.get(`${userId}:${classId}`);
  if (cached && mem && Date.now() - mem.cachedAt < FRESH_MS) return;
  void fetchClassDetail({ userId, classId, fallbackStudentCount });
}
