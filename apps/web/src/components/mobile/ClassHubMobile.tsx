"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Flame,
  Star,
  MessageCircle,
  School,
  Sparkles,
  BarChart3,
  Megaphone,
  FileText,
  FolderOpen,
  Calendar,
  Puzzle,
  Users,
  RefreshCw,
  Search,
  Shield,
  ChevronRight,
  UserRound,
  Clock,
} from "lucide-react";
import {
  MyClassSummary,
  HubStats,
} from "@/lib/api/classesHub";
import {
  fetchClassesHub,
  fetchClassDetail,
  readClassesHubCache,
  readClassDetailCache,
  writeClassesHubCache,
  isClassesHubCacheFresh,
  prefetchClassDetail,
} from "@/lib/classes-hub-cache";
import { timetableAPI, type TimetableEntry, type DayOfWeek } from "@/lib/api/timetable";

const CLASS_CARD_PALETTE = [
  { accent: "#0EA5E9", bg: "#F0F9FF", darkBg: "rgba(14,165,233,0.12)" },
  { accent: "#8B5CF6", bg: "#F5F3FF", darkBg: "rgba(139,92,246,0.12)" },
  { accent: "#10B981", bg: "#ECFDF5", darkBg: "rgba(16,185,129,0.12)" },
  { accent: "#F59E0B", bg: "#FFFBEB", darkBg: "rgba(245,158,11,0.12)" },
  { accent: "#EC4899", bg: "#FDF2F8", darkBg: "rgba(236,72,153,0.12)" },
];

function classPalette(name: string) {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return CLASS_CARD_PALETTE[sum % CLASS_CARD_PALETTE.length];
}

const DAY_KEYS: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

function todayDayKey(): DayOfWeek {
  // JS: 0=Sun … 6=Sat → map to MONDAY-first index
  const js = new Date().getDay();
  return DAY_KEYS[js === 0 ? 6 : js - 1];
}

interface ClassHubMobileProps {
  locale: string;
  user?: {
    id?: string;
    role?: string;
    firstName?: string;
    lastName?: string;
    profilePictureUrl?: string | null;
    schoolId?: string;
    teacherId?: string;
    teacher?: { id?: string };
  } | null;
}

function roleLabel(role: string | undefined, isKm: boolean) {
  switch ((role || "").toUpperCase()) {
    case "STUDENT":
      return isKm ? "សិស្ស" : "Student";
    case "TEACHER":
      return isKm ? "គ្រូ" : "Teacher";
    case "PARENT":
      return isKm ? "មាតាបិតា" : "Parent";
    case "ADMIN":
    case "SCHOOL_ADMIN":
      return isKm ? "អ្នកគ្រប់គ្រង" : "Admin";
    case "STAFF":
      return isKm ? "បុគ្គលិក" : "Staff";
    default:
      return isKm ? "ថ្នាក់" : "Class";
  }
}

function teacherName(
  t?: MyClassSummary["homeroomTeacher"] | null,
  preferEn = false
) {
  if (!t) return "";
  const native = [t.lastName, t.firstName].filter(Boolean).join(" ").trim();
  const en = [t.englishLastName, t.englishFirstName].filter(Boolean).join(" ").trim();
  return preferEn ? en || native : native || en;
}

export default function ClassHubMobile({ locale, user }: ClassHubMobileProps) {
  const isKm = locale === "km";
  const role = (user?.role || "").toUpperCase();
  const isAdminStaff = role === "ADMIN" || role === "STAFF" || role === "SCHOOL_ADMIN" || role === "SUPER_ADMIN";
  const hasTeacherProfile = Boolean(user?.teacherId || user?.teacher?.id);
  const userId = user?.id || "";

  const cachedHub = userId ? readClassesHubCache(userId) : null;
  const initialClassId = cachedHub?.selectedClassId || cachedHub?.myClasses?.[0]?.id || null;
  const cachedDetail =
    userId && initialClassId ? readClassDetailCache(userId, initialClassId) : null;

  const [loading, setLoading] = useState(!cachedHub);
  const [error, setError] = useState(false);
  const [myClasses, setMyClasses] = useState<MyClassSummary[]>(cachedHub?.myClasses ?? []);
  const [directory, setDirectory] = useState<MyClassSummary[]>(cachedHub?.directory ?? []);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(initialClassId);
  const [stats, setStats] = useState<HubStats | null>(cachedHub?.stats ?? null);
  const [studentStats, setStudentStats] = useState(
    cachedDetail?.studentStats ?? { total: 0, male: 0, female: 0 }
  );
  const [attendancePct, setAttendancePct] = useState(cachedDetail?.attendancePct ?? 1);
  const [search, setSearch] = useState("");
  const [hubLoading, setHubLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleDay, setScheduleDay] = useState<DayOfWeek>(() => todayDayKey());
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);

  const orderedClasses = useMemo(() => {
    if (role !== "TEACHER") return myClasses;
    const teaching = myClasses.filter((c) => c.hasTimetableAssignment === true);
    const other = myClasses.filter((c) => c.hasTimetableAssignment !== true);
    return [...teaching, ...other];
  }, [myClasses, role]);

  const selected = useMemo(
    () => orderedClasses.find((c) => c.id === selectedClassId) || myClasses.find((c) => c.id === selectedClassId) || null,
    [orderedClasses, myClasses, selectedClassId]
  );

  const load = useCallback(async (opts?: { silent?: boolean; force?: boolean }) => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const hasVisible = myClasses.length > 0 || directory.length > 0;
    const silent = (opts?.silent === true || hasVisible) && !opts?.force;
    try {
      setError(false);
      if (!silent) setLoading(true);

      if (!opts?.force && isClassesHubCacheFresh(userId) && hasVisible) {
        setLoading(false);
        return;
      }

      const payload = await fetchClassesHub({
        userId,
        role: user?.role,
        force: opts?.force,
      });
      if (payload) {
        setMyClasses(payload.myClasses);
        setDirectory(payload.directory);
        setStats(payload.stats);
        setSelectedClassId((prev) => {
          if (prev && payload.myClasses.some((c) => c.id === prev)) return prev;
          return payload.selectedClassId;
        });
      } else if (!hasVisible) {
        setError(true);
      }
    } catch {
      if (!hasVisible) setError(true);
    } finally {
      setLoading(false);
    }
  }, [userId, user?.role, myClasses.length, directory.length]);

  const refresh = useCallback(async () => {
    if (!userId || refreshing) return;
    setRefreshing(true);
    try {
      await load({ force: true, silent: true });
      if (selectedClassId) {
        await fetchClassDetail({
          userId,
          classId: selectedClassId,
          fallbackStudentCount: selected?.studentCount || 0,
          force: true,
        }).then((detail) => {
          if (!detail) return;
          setStudentStats(detail.studentStats);
          setAttendancePct(detail.attendancePct);
        });
      }
    } finally {
      setRefreshing(false);
    }
  }, [userId, refreshing, load, selectedClassId, selected?.studentCount]);


  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    if (cachedHub) {
      setLoading(false);
      if (!isClassesHubCacheFresh(userId)) void load({ silent: true });
      return;
    }
    void load({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && !isClassesHubCacheFresh(userId)) {
        void load({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [userId, load]);

  // Load hub detail when class selected (hydrate-first)
  useEffect(() => {
    if (!selectedClassId || !userId) return;
    let cancelled = false;

    const cached = readClassDetailCache(userId, selectedClassId);
    if (cached) {
      setStudentStats(cached.studentStats);
      setAttendancePct(cached.attendancePct);
    }

    (async () => {
      if (!cached) setHubLoading(true);
      try {
        const detail = await fetchClassDetail({
          userId,
          classId: selectedClassId,
          fallbackStudentCount: selected?.studentCount || 0,
        });
        if (cancelled || !detail) return;
        setStudentStats(detail.studentStats);
        setAttendancePct(detail.attendancePct);
      } finally {
        if (!cancelled) setHubLoading(false);
      }
    })();

    // Persist selected class id into hub cache
    const hub = readClassesHubCache(userId);
    if (hub && hub.selectedClassId !== selectedClassId) {
      writeClassesHubCache(userId, { ...hub, selectedClassId });
    }

    return () => {
      cancelled = true;
    };
  }, [selectedClassId, userId, selected?.studentCount]);

  // Prefetch detail for sibling classes
  useEffect(() => {
    if (!userId || myClasses.length < 2) return;
    myClasses.slice(0, 4).forEach((c) => {
      if (c.id !== selectedClassId) {
        prefetchClassDetail(userId, c.id, c.studentCount);
      }
    });
  }, [userId, myClasses, selectedClassId]);

  // Timetable preview for selected class
  useEffect(() => {
    if (!selectedClassId) {
      setTimetableEntries([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await timetableAPI.getClassTimetable(
          selectedClassId,
          selected?.academicYear?.id
        );
        if (cancelled) return;
        setTimetableEntries(Array.isArray(res?.data?.entries) ? res.data.entries : []);
      } catch {
        if (!cancelled) setTimetableEntries([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClassId, selected?.academicYear?.id]);

  const dayEntries = useMemo(() => {
    return timetableEntries
      .filter((e) => e.dayOfWeek === scheduleDay)
      .sort((a, b) => (a.period?.order ?? 0) - (b.period?.order ?? 0));
  }, [timetableEntries, scheduleDay]);

  const filteredDirectory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return directory;
    return directory.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.grade?.toLowerCase().includes(q) ||
        (c.section || "").toLowerCase().includes(q)
    );
  }, [directory, search]);

  const tools = useMemo(() => {
    if (!selectedClassId) return [];
    const id = selectedClassId;
    const qs = new URLSearchParams({ classId: id });
    if (selected?.name) qs.set("className", selected.name);
    const canManage = ["TEACHER", "ADMIN", "STAFF", "SCHOOL_ADMIN", "SUPER_ADMIN"].includes(
      (selected?.myRole || role).toUpperCase()
    );
    const canMessageTeacher =
      role === "PARENT" && Boolean(selected?.homeroomTeacher?.id);

    const items = [
      {
        key: "report",
        label: isKm ? "របាយការណ៍" : "Report",
        href: `/${locale}/grades/reports?${qs}`,
        icon: BarChart3,
        bg: "#EFF6FF",
        color: "#2563EB",
      },
      {
        key: "announce",
        label: isKm ? "សេចក្តីប្រកាស" : "Announce",
        href: canManage
          ? `/${locale}/classes/${id}/manage?tab=announce`
          : `/${locale}/messages`,
        icon: Megaphone,
        bg: "#EFF6FF",
        color: "#3B82F6",
      },
      {
        key: "assign",
        label: isKm ? "កិច្ចការ" : "Assign",
        href: canManage
          ? `/${locale}/classes/${id}/manage?tab=assign`
          : `/${locale}/learn`,
        icon: FileText,
        bg: "#FEF2F2",
        color: "#EF4444",
      },
      {
        key: "materials",
        label: isKm ? "ឯកសារ" : "Materials",
        href: canManage
          ? `/${locale}/classes/${id}/manage?tab=materials`
          : `/${locale}/learn`,
        icon: FolderOpen,
        bg: "#F0FDF4",
        color: "#22C55E",
      },
      {
        key: "attend",
        label: isKm ? "វត្តមាន" : "Attend",
        href: canManage
          ? `/${locale}/attendance/mark?${qs}`
          : `/${locale}/attendance/dashboard?${qs}`,
        icon: Calendar,
        bg: "#FFFBEB",
        color: "#F59E0B",
      },
      {
        key: "scores",
        label: isKm ? "ពិន្ទុ" : "Scores",
        href: canManage
          ? `/${locale}/grades/entry?${qs}`
          : `/${locale}/grades/monthly-report?${qs}`,
        icon: BarChart3,
        bg: "#F3E8FF",
        color: "#A855F7",
      },
      {
        key: "quizzes",
        label: isKm ? "កម្រងសំណួរ" : "Quizzes",
        href: canManage
          ? `/${locale}/teacher/quizzes/analytics`
          : `/${locale}/live-quiz/join`,
        icon: Puzzle,
        bg: "#ECFEFF",
        color: "#06B6D4",
      },
      {
        key: "members",
        label: isKm ? "សមាជិក" : "Members",
        href: `/${locale}/classes/${id}/roster`,
        icon: Users,
        bg: "#FDE4CF",
        color: "#F97316",
      },
    ];

    if (canMessageTeacher) {
      items.push({
        key: "message",
        label: isKm ? "សារ" : "Message",
        href: `/${locale}/messages`,
        icon: MessageCircle,
        bg: "#F1F5F9",
        color: "#64748B",
      });
    }

    return items;
  }, [selectedClassId, selected?.myRole, selected?.name, selected?.homeroomTeacher?.id, role, locale, isKm]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="px-4 py-6 space-y-4 animate-pulse">
        <div className="flex justify-between">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="flex gap-2">
            <div className="w-16 h-8 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="w-16 h-8 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
        <div className="h-40 rounded-3xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-slate-500 mb-4">
          {isKm ? "មិនអាចផ្ទុកថ្នាក់បានទេ" : "Couldn’t load your classes"}
        </p>
        <button
          type="button"
          onClick={() => load({ force: true })}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 text-white text-sm font-bold"
        >
          <RefreshCw className="w-4 h-4" />
          {isKm ? "ព្យាយាមម្តងទៀត" : "Retry"}
        </button>
      </div>
    );
  }

  // ── Admin/Staff directory (no personal class) ──
  if (myClasses.length === 0 && isAdminStaff && !hasTeacherProfile) {
    return (
      <div className="px-4 pb-6 space-y-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            {isKm ? "បញ្ជីថ្នាក់" : "Class directory"}
          </h2>
          <p className="text-sm text-slate-500">
            {isKm ? "ស្វែងរក និងគ្រប់គ្រងថ្នាក់ក្នុងសាលា" : "Browse and manage school classes"}
          </p>
        </div>

        <Link
          href={`/${locale}/admin/discipline`}
          className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg"
        >
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">
              {isKm ? "Discipline Workbench" : "Discipline Workbench"}
            </p>
            <p className="text-xs text-white/85">
              {isKm ? "គ្រប់គ្រងវិន័យសិស្ស" : "Student discipline tools"}
            </p>
          </div>
          <ChevronRight className="w-5 h-5" />
        </Link>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isKm ? "ស្វែងរកថ្នាក់…" : "Search classes…"}
            className="w-full pl-10 pr-3 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
          />
        </div>

        {filteredDirectory.length === 0 ? (
          <div className="py-16 text-center">
            <School className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700 dark:text-slate-200">
              {isKm ? "មិនមានថ្នាក់" : "No classes"}
            </p>
            <Link
              href={`/${locale}/classes`}
              className="inline-block mt-3 text-sm font-bold text-teal-600"
            >
              {isKm ? "បើកទំព័រគ្រប់គ្រងថ្នាក់" : "Open class management"}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filteredDirectory.map((cls) => {
              const palette = classPalette(cls.name);
              return (
                <Link
                  key={cls.id}
                  href={`/${locale}/classes/${cls.id}/manage`}
                  className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 shadow-sm active:scale-[0.98] transition"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 dark:bg-opacity-100"
                    style={{ backgroundColor: palette.bg }}
                  >
                    <School className="w-5 h-5" style={{ color: palette.accent }} />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                    {cls.name}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isKm ? `ថ្នាក់ទី ${cls.grade}` : `Grade ${cls.grade}`}
                    {cls.section ? ` · ${cls.section}` : ""}
                  </p>
                  <p className="text-[11px] font-semibold mt-1" style={{ color: palette.accent }}>
                    {cls.studentCount} {isKm ? "សិស្ស" : "students"}
                  </p>
                </Link>
              );
            })}
          </div>
        )}

        <Link
          href={`/${locale}/classes`}
          className="block text-center text-sm font-bold text-teal-600 py-2"
        >
          {isKm ? "មើលការគ្រប់គ្រងពេញលេញ →" : "Full class management →"}
        </Link>
        <Link
          href={`/${locale}/clubs?community=1`}
          className="block text-center text-xs font-semibold text-slate-400 py-1"
        >
          {isKm ? "មើល Study Clubs" : "Browse study clubs"}
        </Link>
      </div>
    );
  }

  // ── Empty (student/teacher with no class) ──
  if (myClasses.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center mb-4">
          <School className="w-8 h-8 text-teal-500" />
        </div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-1">
          {isKm ? "មិនទាន់មានថ្នាក់" : "No classes yet"}
        </h2>
        <p className="text-sm text-slate-500 mb-5 max-w-xs mx-auto">
          {isKm
            ? "នៅពេលអ្នកត្រូវបានភ្ជាប់ទៅថ្នាក់ វានឹងបង្ហាញនៅទីនេះ"
            : "When you’re linked to a class, it will show up here"}
        </p>
        <Link
          href={`/${locale}/clubs?community=1`}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-600"
        >
          {isKm ? "រុករក Study Clubs" : "Browse study clubs"}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const xp = stats?.xp ?? 0;
  const pct = Math.max(0, Math.min(1, attendancePct));
  const ring = 2 * Math.PI * 22;

  return (
    <div className="pb-4 bg-white dark:bg-slate-950 min-h-[60vh]">
      {/* Compact top bar (native ClubsScreen) */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="relative">
          {user?.profilePictureUrl ? (
            <Image
              src={user.profilePictureUrl}
              alt=""
              width={38}
              height={38}
              className="w-[38px] h-[38px] rounded-full object-cover"
            />
          ) : (
            <div className="w-[38px] h-[38px] rounded-full bg-violet-500 flex items-center justify-center text-white font-extrabold text-sm">
              {(user?.firstName || "S")[0]}
            </div>
          )}
          {!!stats?.level && (
            <span className="absolute -bottom-0.5 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-[9px] font-bold text-white flex items-center justify-center border-[1.5px] border-white dark:border-slate-950">
              {stats.level}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 text-orange-600 text-sm font-bold">
            <Flame className="w-3.5 h-3.5" />
            {stats?.currentStreak ?? 0}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-600 text-sm font-bold">
            <Star className="w-3 h-3 fill-amber-500" />
            {xp >= 1000 ? `${(xp / 1000).toFixed(1)}k` : xp} XP
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            aria-label={isKm ? "ធ្វើឱ្យថ្មី" : "Refresh"}
            className="w-[38px] h-[38px] rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-500"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-teal-500" : ""}`} />
          </button>
          <Link
            href={`/${locale}/messages`}
            className="w-[38px] h-[38px] rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-sky-500"
          >
            <MessageCircle className="w-[18px] h-[18px]" />
          </Link>
        </div>
      </div>

      <div className="px-4 pt-3 space-y-4">
        {/* Premium hero */}
        {selected && (
          <div
            className="relative overflow-hidden rounded-3xl text-white shadow-xl shadow-teal-500/20"
            style={{ background: "linear-gradient(135deg, #0CA2C4 0%, #0F766E 100%)" }}
          >
            <div className="absolute -top-16 -right-10 w-40 h-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-10 left-10 w-28 h-28 rounded-full bg-white/10" />
            <div className="absolute top-3 right-16 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>

            <div className="relative z-10 p-5 pb-4">
              <div className="flex gap-3">
                <div className="flex-1 min-w-0">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/20 px-2 py-0.5 rounded-full mb-2">
                    <UserRound className="w-3 h-3" />
                    {roleLabel(selected.myRole || role, isKm)}
                  </span>
                  <h2 className="text-xl font-black leading-tight truncate">{selected.name}</h2>
                  <p className="text-xs text-white/85 mt-1">
                    {isKm ? `ថ្នាក់ទី ${selected.grade}` : `Grade ${selected.grade}`}
                    {selected.track ? ` · ${selected.track}` : ""}
                    {selected.section ? ` · ${selected.section}` : ""}
                  </p>
                </div>
                <div className="relative w-[52px] h-[52px] shrink-0">
                  <svg width="52" height="52" className="-rotate-90">
                    <circle cx="26" cy="26" r="22" stroke="rgba(255,255,255,0.3)" strokeWidth="5" fill="none" />
                    <circle
                      cx="26"
                      cy="26"
                      r="22"
                      stroke="#fff"
                      strokeWidth="5"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${ring * pct} ${ring}`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black">
                    {hubLoading ? "…" : `${Math.round(pct * 100)}%`}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-3 divide-x divide-white/20 bg-black/15 px-2 py-3">
              {[
                { n: studentStats.total, l: isKm ? "សិស្ស" : "Students" },
                { n: studentStats.male, l: isKm ? "ប្រុស" : "Male" },
                { n: studentStats.female, l: isKm ? "ស្រី" : "Female" },
              ].map((s) => (
                <div key={s.l} className="text-center">
                  <p className="text-lg font-black leading-none">{s.n}</p>
                  <p className="text-[10px] text-white/80 mt-1">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Class selector pills — teachers: teaching classes first */}
        {orderedClasses.length > 1 && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1 pb-0.5">
            {orderedClasses.map((cls) => {
              const active = cls.id === selectedClassId;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold border-[1.5px] transition ${
                    active
                      ? "bg-teal-500 border-teal-500 text-white"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {cls.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Bento tools */}
        <div>
          <div className="mb-2.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isKm ? "ឧបករណ៍ថ្នាក់" : "Class hub tools"}
            </h3>
            <p className="text-[11px] text-slate-500">
              {isKm ? "ចូលរហ័សទៅមុខងារសំខាន់ៗ" : "Quick access to key class features"}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.key}
                  href={tool.href}
                  className="flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm active:scale-[0.97] transition"
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: tool.bg }}
                  >
                    <Icon className="w-5 h-5" style={{ color: tool.color }} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 text-center leading-tight">
                    {tool.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Timetable preview */}
        {timetableEntries.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isKm ? "កាលវិភាគថ្នាក់" : "Class schedule"}
              </h3>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-2 mb-2">
              {(isKm
                ? ["ច", "អ", "ពុ", "ព្រ", "សុ", "ស", "អា"]
                : ["M", "T", "W", "T", "F", "S", "S"]
              ).map((label, ix) => {
                const day = DAY_KEYS[ix];
                const active = day === scheduleDay;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setScheduleDay(day)}
                    className={`w-9 h-9 rounded-full text-xs font-bold shrink-0 ${
                      active
                        ? "bg-teal-500 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {dayEntries.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                {isKm ? "មិនមានម៉ោងសិក្សាថ្ងៃនេះ" : "No periods this day"}
              </p>
            ) : (
              <div className="space-y-2">
                {dayEntries.map((entry) => {
                  const subject = isKm
                    ? entry.subject?.nameKh || entry.subject?.name
                    : entry.subject?.name || entry.subject?.nameKh;
                  const teacher = entry.teacher
                    ? [entry.teacher.lastName, entry.teacher.firstName].filter(Boolean).join(" ")
                    : "";
                  return (
                    <div
                      key={entry.id}
                      className="flex gap-3 items-start rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5"
                    >
                      <div className="text-[10px] font-bold text-teal-600 w-14 shrink-0 leading-tight pt-0.5">
                        {entry.period?.startTime || "—"}
                        <br />
                        <span className="text-slate-400 font-medium">{entry.period?.endTime || ""}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                          {subject || (isKm ? "មុខវិជ្ជា" : "Subject")}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {teacher || entry.room || entry.period?.name || ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Homeroom teacher */}
        {selected?.homeroomTeacher && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              {isKm ? "គ្រូបន្ទុកថ្នាក់" : "Homeroom teacher"}
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold">
                {(selected.homeroomTeacher.firstName || "T")[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {teacherName(selected.homeroomTeacher, !isKm)}
                </p>
                <p className="text-xs text-slate-500">
                  {isKm ? "គ្រូបន្ទុកថ្នាក់" : "Homeroom"}
                  {selected.isHomeroom ? (isKm ? " · អ្នក" : " · You") : ""}
                </p>
              </div>
              {role === "PARENT" && (
                <Link
                  href={`/${locale}/messages`}
                  className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sky-500"
                >
                  <MessageCircle className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Year + community clubs secondary */}
        <div className="flex items-center justify-between pt-1 pb-2">
          <p className="text-[11px] text-slate-400">
            {selected?.academicYear?.name || ""}
          </p>
          <Link
            href={`/${locale}/clubs?community=1`}
            className="text-[11px] font-bold text-teal-600"
          >
            {isKm ? "Study Clubs →" : "Study Clubs →"}
          </Link>
        </div>
      </div>
    </div>
  );
}
