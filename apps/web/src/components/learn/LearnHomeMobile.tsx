"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Flame,
  Star,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Lock,
  Check,
  Plus,
  BookOpen,
  Calculator,
  FlaskConical,
  Leaf,
  Magnet,
  Laptop,
  Puzzle,
  Scale,
  ArrowLeftRight,
  GitCompare,
  TrendingUp,
  Triangle,
  BarChart3,
  Circle,
  Box,
  Compass,
  Trophy,
  Shuffle,
  FileText,
  ArrowRight,
  RefreshCw,
  Rocket,
  Zap,
  School,
} from "lucide-react";
import {
  learnPathApi,
  LearnerProfile,
  LearnPath,
  LearnUnit,
  PerformanceStatsSummary,
  TopicSubject,
} from "@/lib/api/learnPath";
import {
  fetchLearnHome,
  readLearnHomeCache,
  writeLearnHomeCache,
  isLearnHomeCacheFresh,
  invalidateLearnHomeCache,
} from "@/lib/learn-home-cache";

const GRADES = ["7", "8", "9", "10", "11", "12"];
const ACCENTS = ["#0EA5E9", "#8B5CF6", "#F59E0B", "#10B981", "#EC4899", "#F97316"];
const GRADIENTS: Record<string, [string, string]> = {
  "#0EA5E9": ["#38BDF8", "#4F46E5"],
  "#8B5CF6": ["#A78BFA", "#EC4899"],
  "#F59E0B": ["#FBBF24", "#F97316"],
  "#10B981": ["#34D399", "#06B6D4"],
  "#EC4899": ["#F472B6", "#8B5CF6"],
  "#F97316": ["#FB923C", "#EF4444"],
};

const UNIT_ICONS = [
  Calculator,
  Puzzle,
  Scale,
  ArrowLeftRight,
  GitCompare,
  TrendingUp,
  BarChart3,
  Triangle,
  Compass,
  Circle,
  Box,
  FlaskConical,
];

function accentPair(index: number) {
  const accent = ACCENTS[index % ACCENTS.length];
  const [a, b] = GRADIENTS[accent] ?? [accent, accent];
  return { accent, gradStart: a, gradEnd: b };
}

function subjectIcon(code: string) {
  if (code.startsWith("MATH")) return Calculator;
  if (code.startsWith("PHY")) return Magnet;
  if (code.startsWith("CHEM")) return FlaskConical;
  if (code.startsWith("BIO")) return Leaf;
  if (code.startsWith("ENG")) return MessageCircle;
  if (code.startsWith("ICT")) return Laptop;
  return BookOpen;
}

function subjectDisplayName(
  s: { name: string; nameEn: string | null; nameKh: string | null; grade?: string; code?: string },
  isKm: boolean
) {
  const base =
    (isKm ? s.nameKh || s.nameEn || s.name : s.nameEn || s.nameKh || s.name) || s.name;
  return base;
}

function unitDisplayName(u: LearnUnit, isKm: boolean) {
  return isKm ? u.nameKh || u.name : u.name;
}


type PracticeStep = {
  id: string;
  titleKh: string;
  titleEn: string;
  targetVal: number;
  state: "locked" | "unlocked" | "completed";
  minDifficulty?: number;
  maxDifficulty?: number;
  icon: "puzzle" | "zap" | "flame" | "rocket" | "trophy";
};

function buildPracticeSteps(unit: LearnUnit, grade?: string): PracticeStep[] {
  const bandCounts = unit.difficultyCounts ?? {};
  const countInRange = (lo: number, hi: number) => {
    let sum = 0;
    for (let lvl = lo; lvl <= hi; lvl++) sum += bandCounts[lvl as 1 | 2 | 3 | 4 | 5] ?? 0;
    return sum;
  };
  const MIN_PER_BAND = 2;
  const has5DistinctBands = [1, 2, 3, 4, 5].every((lvl) => countInRange(lvl, lvl) >= MIN_PER_BAND);
  const has3DistinctBands =
    countInRange(1, 2) >= MIN_PER_BAND &&
    countInRange(3, 3) >= MIN_PER_BAND &&
    countInRange(4, 5) >= MIN_PER_BAND;
  const wantsLongLadder = unit.totalQuestions > 12 || grade === "12";

  // Khmer titles copied from native LearnHomeScreen.
  const KH = {
    p1b: 'លំហាត់អនុវត្តន៍ ១ (កម្រិតមូលដ្ឋាន)',
    p2m: 'លំហាត់អនុវត្តន៍ ២ (កម្រិតមធ្យម)',
    p3a: 'លំហាត់អនុវត្តន៍ ៣ (កម្រិតខ្ពស់)',
    p4e: 'លំហាត់អនុវត្តន៍ ៤ (ត្រៀមប្រឡង)',
    p5f: 'លំហាត់ផ្ដាច់ព្រ័ត្រ (បាក់ឌុប)',
    p1: 'លំហាត់អនុវត្តន៍ ១',
    p2: 'លំហាត់អនុវត្តន៍ ២',
    final: 'លំហាត់ផ្ដាច់ព្រ័ត្រ',
  };

  type Raw = {
    id: string;
    ratio: number;
    titleKh: string;
    titleEn: string;
    icon: PracticeStep["icon"];
    minDifficulty?: number;
    maxDifficulty?: number;
  };

  const rawSteps: Raw[] =
    wantsLongLadder && has5DistinctBands
      ? [
          { id: "p1", ratio: 0.2, titleKh: KH.p1b, titleEn: "Practice Quiz 1 (Basic)", icon: "puzzle", minDifficulty: 1, maxDifficulty: 1 },
          { id: "p2", ratio: 0.4, titleKh: KH.p2m, titleEn: "Practice Quiz 2 (Medium)", icon: "zap", minDifficulty: 2, maxDifficulty: 2 },
          { id: "p3", ratio: 0.65, titleKh: KH.p3a, titleEn: "Practice Quiz 3 (Advanced)", icon: "flame", minDifficulty: 3, maxDifficulty: 3 },
          { id: "p4", ratio: 0.85, titleKh: KH.p4e, titleEn: "Practice Quiz 4 (Exam Prep)", icon: "rocket", minDifficulty: 4, maxDifficulty: 4 },
          { id: "p5", ratio: 1.0, titleKh: KH.p5f, titleEn: "Final Challenge (Bac II)", icon: "trophy", minDifficulty: 5, maxDifficulty: 5 },
        ]
      : has3DistinctBands
        ? [
            { id: "p1", ratio: 0.4, titleKh: KH.p1, titleEn: "Practice Quiz 1", icon: "puzzle", minDifficulty: 1, maxDifficulty: 2 },
            { id: "p2", ratio: 0.8, titleKh: KH.p2, titleEn: "Practice Quiz 2", icon: "zap", minDifficulty: 3, maxDifficulty: 3 },
            { id: "p3", ratio: 1.0, titleKh: KH.final, titleEn: "Final Challenge", icon: "trophy", minDifficulty: 4, maxDifficulty: 5 },
          ]
        : [
            { id: "p1", ratio: 0.4, titleKh: KH.p1, titleEn: "Practice Quiz 1", icon: "puzzle" },
            { id: "p2", ratio: 0.8, titleKh: KH.p2, titleEn: "Practice Quiz 2", icon: "zap" },
            { id: "p3", ratio: 1.0, titleKh: KH.final, titleEn: "Final Challenge", icon: "trophy" },
          ];

  const steps: PracticeStep[] = rawSteps.map((raw) => ({
    id: raw.id,
    titleKh: raw.titleKh,
    titleEn: raw.titleEn,
    icon: raw.icon,
    targetVal: Math.max(1, Math.min(unit.target, Math.round(unit.target * raw.ratio))),
    state: "locked",
    minDifficulty: raw.minDifficulty,
    maxDifficulty: raw.maxDifficulty,
  }));

  steps.forEach((step, idx) => {
    if (unit.correct >= step.targetVal) {
      step.state = "completed";
    } else {
      const prev = steps[idx - 1];
      const prevDone = prev ? prev.state === "completed" : unit.hasLesson ? unit.correct > 0 : true;
      if (prevDone) step.state = "unlocked";
    }
  });
  return steps;
}

function practiceStepIcon(icon: PracticeStep["icon"]) {
  if (icon === "zap") return Zap;
  if (icon === "flame") return Flame;
  if (icon === "rocket") return Rocket;
  if (icon === "trophy") return Trophy;
  return Puzzle;
}

interface MiniCourse {
  id: string;
  title: string;
  category?: string;
  thumbnailUrl?: string | null;
  enrolledCount?: number;
}

interface LearnHomeMobileProps {
  locale: string;
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    profilePictureUrl?: string | null;
  } | null;
  courses?: MiniCourse[];
}

export default function LearnHomeMobile({ locale, user, courses = [] }: LearnHomeMobileProps) {
  const router = useRouter();
  const isKm = locale === "km";
  const userId = user?.id || "";

  const cachedHome = userId ? readLearnHomeCache(userId) : null;

  const [loading, setLoading] = useState(!cachedHome);
  const [loadError, setLoadError] = useState(false);
  const [pathError, setPathError] = useState(false);
  const [profile, setProfile] = useState<LearnerProfile | null>(cachedHome?.profile ?? null);
  const [path, setPath] = useState<LearnPath | null>(cachedHome?.path ?? null);
  const [stats, setStats] = useState<PerformanceStatsSummary | null>(cachedHome?.stats ?? null);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(
    cachedHome?.activeSubjectId ?? null
  );
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(() => {
    const units = cachedHome?.path?.units;
    const active = units?.find((u) => u.state === "unlocked");
    return active?.topicId ?? null;
  });
  const [editingPath, setEditingPath] = useState(false);

  // Onboarding
  const [obStarted, setObStarted] = useState(false);
  const [obGrade, setObGrade] = useState<string | null>(null);
  const [obSubjects, setObSubjects] = useState<TopicSubject[] | null>(null);
  const [obSelected, setObSelected] = useState<Set<string>>(new Set());
  const [obSaving, setObSaving] = useState(false);

  const weekDays = isKm
    ? ["ច", "អ", "ពុ", "ព្រ", "សុ", "ស", "អា"]
    : ["M", "T", "W", "T", "F", "S", "S"];
  const todayIndex = (new Date().getDay() + 6) % 7;

  const applyPayload = useCallback((payload: {
    profile: LearnerProfile | null;
    path: LearnPath | null;
    activeSubjectId: string | null;
    stats: PerformanceStatsSummary | null;
  }) => {
    setProfile(payload.profile);
    setPath(payload.path);
    if (payload.activeSubjectId) setActiveSubjectId(payload.activeSubjectId);
    if (payload.stats) setStats(payload.stats);
    if (payload.path?.units) {
      const active = payload.path.units.find((u) => u.state === "unlocked");
      if (active) setExpandedUnitId(active.topicId);
    }
  }, []);

  const loadPath = useCallback(async (subjectId: string) => {
    try {
      setPathError(false);
      const data = await learnPathApi.getPath(subjectId);
      setPath(data);
      setActiveSubjectId(subjectId);
      if (data?.units) {
        const active = data.units.find((u) => u.state === "unlocked");
        if (active) setExpandedUnitId(active.topicId);
      }
      if (userId) {
        const prev = readLearnHomeCache(userId);
        writeLearnHomeCache(userId, {
          profile: prev?.profile ?? profile,
          path: data,
          activeSubjectId: subjectId,
          stats: prev?.stats ?? stats,
        });
      }
    } catch {
      setPathError(true);
    }
  }, [userId, profile, stats]);

  const load = useCallback(async (opts?: { silent?: boolean; force?: boolean }) => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const hasVisible = Boolean(profile || path);
    const silent = (opts?.silent === true || hasVisible) && !opts?.force;
    try {
      setLoadError(false);
      if (!silent) setLoading(true);

      if (!opts?.force && isLearnHomeCacheFresh(userId) && hasVisible) {
        setLoading(false);
        return;
      }

      const payload = await fetchLearnHome({
        userId,
        subjectId: activeSubjectId,
        force: opts?.force,
      });
      if (payload) applyPayload(payload);
      else if (!hasVisible) setLoadError(true);
    } catch {
      if (!hasVisible) setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [userId, profile, path, activeSubjectId, applyPayload]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    // Cache hit: paint instantly, silent refresh if stale
    if (cachedHome) {
      setLoading(false);
      if (!isLearnHomeCacheFresh(userId)) {
        void load({ silent: true });
      }
      return;
    }
    void load({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount / user change
  }, [userId]);

  // Soft revalidate when tab becomes visible again
  useEffect(() => {
    if (!userId) return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && !isLearnHomeCacheFresh(userId)) {
        void load({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [userId, load]);

  useEffect(() => {
    if (!obGrade) {
      setObSubjects(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const list = await learnPathApi.getSubjects(obGrade);
      if (!cancelled) setObSubjects(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [obGrade]);

  const activeUnit = useMemo(
    () => path?.units.find((u) => u.state === "unlocked") ?? null,
    [path]
  );

  const showOnboarding = editingPath || (!loading && !profile?.subjects?.length);

  const openUnit = (unit: LearnUnit) => {
    if (unit.state === "locked" || unit.state === "no_content") return;
    const title = encodeURIComponent(unitDisplayName(unit, isKm));
    const grade = path?.subject?.grade || "";
    const subjectName = encodeURIComponent(
      subjectDisplayName(path!.subject, isKm)
    );
    if (unit.hasLesson) {
      router.push(
        `/${locale}/learn/path/lesson?topicId=${unit.topicId}&title=${title}&grade=${grade}&subjectName=${subjectName}`
      );
    } else {
      router.push(
        `/${locale}/learn/path/practice?topicId=${unit.topicId}&title=${title}&grade=${grade}&subjectName=${subjectName}`
      );
    }
  };

  const openPractice = (
    unit: LearnUnit,
    opts?: { minDifficulty?: number; maxDifficulty?: number; title?: string }
  ) => {
    if (unit.state === "locked" || unit.state === "no_content") return;
    const title = encodeURIComponent(opts?.title || unitDisplayName(unit, isKm));
    const params = new URLSearchParams({
      topicId: unit.topicId,
      title,
      grade: path?.subject?.grade || "",
      subjectName: subjectDisplayName(path!.subject, isKm),
    });
    if (opts?.minDifficulty != null) params.set("minDifficulty", String(opts.minDifficulty));
    if (opts?.maxDifficulty != null) params.set("maxDifficulty", String(opts.maxDifficulty));
    router.push(`/${locale}/learn/path/practice?${params}`);
  };

  const saveOnboarding = async () => {
    if (!obGrade || obSelected.size === 0) return;
    setObSaving(true);
    try {
      await learnPathApi.saveProfile(obGrade, Array.from(obSelected));
      if (userId) invalidateLearnHomeCache(userId);
      setEditingPath(false);
      setObStarted(false);
      setObSelected(new Set());
      setObGrade(null);
      await load({ force: true, silent: false });
    } catch (e) {
      console.error(e);
    } finally {
      setObSaving(false);
    }
  };

  const switchSubject = async (id: string) => {
    if (id === activeSubjectId) return;
    setActiveSubjectId(id);
    setPath(null);
    await loadPath(id);
  };

  // ── Loading ──
  if (loading && !profile && !path) {
    return (
      <div className="px-4 py-8 space-y-4 animate-pulse">
        <div className="flex justify-between">
          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="flex gap-2">
            <div className="w-16 h-8 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
        <div className="h-36 rounded-3xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  if (loadError && !profile) {
    return (
      <div className="px-6 py-16 flex flex-col items-center text-center">
        <p className="text-slate-500 mb-4">
          {isKm ? "មិនអាចផ្ទុកផ្លូវសិក្សាបានទេ" : "Couldn’t load your learning path"}
        </p>
          <button
          type="button"
          onClick={() => load({ force: true })}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 text-white font-semibold text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          {isKm ? "ព្យាយាមម្តងទៀត" : "Retry"}
        </button>
      </div>
    );
  }

  // ── Onboarding ──
  if (showOnboarding) {
    if (!obStarted && !editingPath) {
      return (
        <div className="relative min-h-[70vh] px-5 py-8 overflow-hidden bg-gradient-to-br from-sky-50 via-cyan-50 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <div className="absolute -top-24 -right-20 w-64 h-64 rounded-full bg-cyan-400/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-16 w-56 h-56 rounded-full bg-sky-300/25 blur-3xl" />
          <div className="relative z-10 flex flex-col items-center pt-10">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-sky-400 to-cyan-600 flex items-center justify-center shadow-xl shadow-sky-500/30 mb-8">
              <School className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2">
              {isKm ? "ចាប់ផ្តើមផ្លូវសិក្សា" : "Start your learning path"}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center max-w-xs mb-8">
              {isKm
                ? "ជ្រើសថ្នាក់ និងមុខវិជ្ជា ដើម្បីបង្កើតផ្លូវសិក្សាផ្ទាល់ខ្លួន"
                : "Pick your grade and subjects to build a personal practice path"}
            </p>
            <button
              type="button"
              onClick={() => setObStarted(true)}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold shadow-lg shadow-sky-500/25 active:scale-[0.98]"
            >
              {isKm ? "ចាប់ផ្តើមឥឡូវ" : "Start Now"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="px-4 pb-8 space-y-5">
        <div>
          <p className="text-xs text-slate-500 font-medium">
            {isKm ? `សួស្តី! ${user?.firstName || "អ្នកសិក្សា"}` : `Hi ${user?.firstName || "Learner"}`}
          </p>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            {isKm ? "ស្វែងរកវគ្គសិក្សារបស់អ្នក" : "Find your course"}
          </h2>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-cyan-500 to-sky-700 p-5 text-white shadow-xl">
          <Trophy className="absolute -right-4 -bottom-4 w-28 h-28 text-white/15" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-white/20 px-2.5 py-1 rounded-full mb-2">
              <Zap className="w-3 h-3 text-amber-300" />
              {isKm ? "ផ្លូវសិក្សាផ្ទាល់ខ្លួន" : "Personal path"}
            </span>
            <p className="text-lg font-black mb-1">
              {isKm ? "រៀនតាមឯកតា · អនុវត្ត · រក XP" : "Units · Practice · Earn XP"}
            </p>
            <p className="text-xs text-white/80">
              {isKm ? "ដូចទៅនឹង Mobile App របស់ Stunity" : "Same experience as the Stunity mobile app"}
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
            {isKm ? "ជ្រើសរើសថ្នាក់" : "Pick your grade"}
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {GRADES.map((g) => {
              const selected = obGrade === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setObGrade(g);
                    setObSelected(new Set());
                  }}
                  className={`min-w-[72px] py-3 px-3 rounded-2xl text-xs font-bold border transition ${
                    selected
                      ? "bg-gradient-to-br from-sky-500 to-cyan-500 text-white border-transparent shadow-md"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {isKm ? `ថ្នាក់ទី ${g}` : `Grade ${g}`}
                </button>
              );
            })}
          </div>
        </div>

        {obGrade && (
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              {isKm ? "ជ្រើសរើសមុខវិជ្ជា" : "Pick subjects"}
            </h3>
            {!obSubjects ? (
              <div className="py-8 flex justify-center">
                <RefreshCw className="w-5 h-5 animate-spin text-sky-500" />
              </div>
            ) : obSubjects.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">
                {isKm ? "មិនទាន់មានមុខវិជ្ជាសម្រាប់ថ្នាក់នេះ" : "No subjects for this grade yet"}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {obSubjects.map((s, i) => {
                  const selected = obSelected.has(s.id);
                  const { accent, gradStart, gradEnd } = accentPair(i);
                  const Icon = subjectIcon(s.code);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setObSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.id)) next.delete(s.id);
                          else next.add(s.id);
                          return next;
                        });
                      }}
                      className={`relative overflow-hidden rounded-2xl p-3.5 text-left border-2 transition ${
                        selected ? "border-transparent text-white" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      }`}
                      style={
                        selected
                          ? { background: `linear-gradient(135deg, ${gradStart}, ${gradEnd})` }
                          : undefined
                      }
                    >
                      <Icon className={`w-5 h-5 mb-2 ${selected ? "text-white" : ""}`} style={!selected ? { color: accent } : undefined} />
                      <p className={`text-xs font-bold line-clamp-2 ${selected ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>
                        {subjectDisplayName(s, isKm)}
                      </p>
                      {selected && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/25 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {(editingPath || profile) && (
            <button
              type="button"
              onClick={() => {
                setEditingPath(false);
                setObStarted(false);
              }}
              className="flex-1 py-3 rounded-2xl font-semibold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
            >
              {isKm ? "បោះបង់" : "Cancel"}
            </button>
          )}
          <button
            type="button"
            disabled={!obGrade || obSelected.size === 0 || obSaving}
            onClick={saveOnboarding}
            className="flex-[2] py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-sky-500 to-cyan-500 disabled:opacity-40"
          >
            {obSaving
              ? isKm
                ? "កំពុងរក្សាទុក…"
                : "Saving…"
              : isKm
                ? "រក្សាទុក និងចាប់ផ្តើម"
                : "Save & start"}
          </button>
        </div>
      </div>
    );
  }

  // ── Main Learn Home ──
  const total = path?.units.length ?? 0;
  const done = path?.units.filter((u) => u.state === "completed").length ?? 0;
  const pct = total > 0 ? done / total : 0;
  const SubjectIcon = path ? subjectIcon(path.subject.code) : BookOpen;
  const xp = stats?.xp ?? 0;
  const level = stats?.level ?? 1;
  const xpProgress = Math.min(1, stats?.xpProgress ?? 0);
  const xpToNext = stats?.xpToNextLevel ?? 100;
  const xpEarned = Math.round(xpProgress * xpToNext);
  const hasStreak = (stats?.currentStreak ?? 0) > 0;
  const allDone =
    !!path && path.units.every((u) => u.state === "completed" || u.state === "no_content");
  const topCourses = [...courses]
    .sort((a, b) => (b.enrolledCount ?? 0) - (a.enrolledCount ?? 0))
    .slice(0, 4);

  return (
    <div className="px-4 pb-6 space-y-4 bg-slate-100/80 dark:bg-slate-950 min-h-[60vh]">
      {/* Hero */}
      <div className="flex items-center justify-between pt-1">
        <div className="relative">
          {user?.profilePictureUrl ? (
            <Image
              src={user.profilePictureUrl}
              alt=""
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow">
              {(user?.firstName || "S")[0]}
            </div>
          )}
          {!!stats?.level && (
            <span className="absolute -bottom-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-amber-400 text-[10px] font-black text-slate-900 flex items-center justify-center border-2 border-white dark:border-slate-950">
              {stats.level}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full ${
              hasStreak ? "bg-orange-100 dark:bg-orange-500/15" : "bg-slate-200/80 dark:bg-slate-800"
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${hasStreak ? "text-orange-500" : "text-slate-400"}`} />
            <span className={`text-xs font-bold ${hasStreak ? "text-orange-600" : "text-slate-500"}`}>
              {stats?.currentStreak ?? 0}
            </span>
          </div>
          {xp > 0 && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                {xp >= 1000 ? `${(xp / 1000).toFixed(1)}k` : xp} XP
              </span>
            </div>
          )}
          <Link
            href={`/${locale}/learn/path/tutor?${new URLSearchParams({
              grade: path?.subject?.grade || "",
              subjectName: path ? subjectDisplayName(path.subject, false) : "",
              subjectNameKh: path ? subjectDisplayName(path.subject, true) : "",
            }).toString()}`}
            className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sky-500 shadow-sm"
            aria-label="Tutor"
          >
            <MessageCircle className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          </Link>
        </div>
      </div>

      {/* Subject hero card */}
      {path && (
        <div
          className="relative overflow-hidden rounded-3xl p-5 text-white shadow-xl shadow-indigo-500/20"
          style={{ background: "linear-gradient(135deg, #0EA5E9 0%, #4F46E5 100%)" }}
        >
          <div className="absolute -top-14 -right-10 w-36 h-36 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 right-16 w-20 h-20 rounded-full bg-white/10" />
          <div className="absolute top-2 right-24 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center">
            <Star className="w-3 h-3 text-white fill-white" />
          </div>
          <div className="absolute bottom-16 right-1 w-7 h-7 rounded-full bg-emerald-400 flex items-center justify-center">
            <Rocket className="w-3.5 h-3.5 text-white" />
          </div>

          <div className="relative z-10 flex gap-3">
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/20 px-2 py-0.5 rounded-full mb-2">
                <SubjectIcon className="w-3 h-3" />
                {isKm ? `ថ្នាក់ទី ${path.subject.grade}` : `Grade ${path.subject.grade}`}
              </span>
              <h2 className="text-xl font-black leading-tight mb-1 truncate">
                {subjectDisplayName(path.subject, isKm)}
              </h2>
              <p className="text-xs text-white/80">
                {isKm ? `បានបញ្ចប់ ${done}/${total} មេរៀន` : `${done}/${total} units done`}
              </p>
            </div>
            <div className="relative w-14 h-14 shrink-0">
              <svg width="56" height="56" className="-rotate-90">
                <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.3)" strokeWidth="6" fill="none" />
                <circle
                  cx="28"
                  cy="28"
                  r="22"
                  stroke="white"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 22 * pct} ${2 * Math.PI * 22}`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black">
                {Math.round(pct * 100)}%
              </span>
            </div>
          </div>

          {activeUnit && (
            <button
              type="button"
              onClick={() => openUnit(activeUnit)}
              className="relative z-10 mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white text-indigo-600 font-bold text-sm shadow-md active:scale-[0.98]"
            >
              {isKm ? "បន្តសិក្សា" : "Continue learning"}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* XP bar */}
      {stats && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-[11px] font-bold text-amber-700">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              Lv. {level}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {xpEarned} / {xpToNext} XP
            </span>
            <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-[11px] font-bold text-amber-700">
              Lv. {level + 1}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
              style={{ width: `${Math.min(100, xpProgress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Subject rail */}
      {profile && profile.subjects.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 px-0.5">
            {isKm ? "មុខវិជ្ជារបស់ខ្ញុំ" : "My subjects"}
          </h3>
          <div className="flex gap-2.5 overflow-x-auto pb-1 hide-scrollbar -mx-1 px-1">
            {profile.subjects.map((s, i) => {
              const active = activeSubjectId === s.id;
              const { accent } = accentPair(i);
              const Icon = subjectIcon(s.code);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => switchSubject(s.id)}
                  className={`shrink-0 w-[108px] rounded-2xl p-3 text-center border transition shadow-sm ${
                    active
                      ? "border-2 bg-white dark:bg-slate-900"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  }`}
                  style={active ? { borderColor: accent } : undefined}
                >
                  <div
                    className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2"
                    style={{ backgroundColor: `${accent}18` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: accent }} />
                  </div>
                  <p
                    className="text-[11px] font-bold line-clamp-2 leading-tight"
                    style={{ color: active ? accent : undefined }}
                  >
                    {subjectDisplayName(s, isKm)}
                  </p>
                  <p className="text-[9px] mt-1.5 font-medium" style={{ color: active ? accent : "#94a3b8" }}>
                    {active
                      ? isKm
                        ? "កំពុងសិក្សា"
                        : "Active"
                      : isKm
                        ? "ចុចដើម្បីរៀន"
                        : "Tap to study"}
                  </p>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setEditingPath(true);
                setObStarted(true);
                setObGrade(profile.grade || null);
              }}
              className="shrink-0 w-[108px] rounded-2xl p-3 text-center border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-900/50"
            >
              <div className="w-12 h-12 mx-auto rounded-full border-2 border-sky-400 flex items-center justify-center mb-2 bg-sky-50 dark:bg-sky-500/10">
                <Plus className="w-6 h-6 text-sky-500" />
              </div>
              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                {isKm ? "បន្ថែម" : "Add"}
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Week streak */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {isKm ? "សប្តាហ៍នេះ" : "This week"}
          </h3>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            {stats?.currentStreak ?? 0}
          </span>
        </div>
        <div className="flex justify-between gap-1">
          {weekDays.map((d, i) => {
            const active = !!stats?.weekActivity?.[i];
            const isToday = i === todayIndex;
            return (
              <div
                key={`${d}-${i}`}
                className={`flex-1 flex flex-col items-center gap-1.5 py-2 rounded-xl ${
                  isToday ? "bg-sky-50 dark:bg-sky-500/10" : ""
                }`}
              >
                <span
                  className={`text-[10px] font-semibold ${
                    active ? "text-orange-600" : isToday ? "text-sky-600" : "text-slate-400"
                  }`}
                >
                  {d}
                </span>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    active
                      ? "bg-orange-500"
                      : isToday
                        ? "border-2 border-sky-400"
                        : "bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  {active ? (
                    <Flame className="w-3 h-3 text-white" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Streak nudge */}
      {activeUnit && stats && !stats.studiedToday && (
        <button
          type="button"
          onClick={() => openUnit(activeUnit)}
          className="w-full flex items-center gap-3 p-4 rounded-2xl text-left text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, #FB923C, #EF4444)" }}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">
              {stats.currentStreak
                ? isKm
                  ? "រក្សា streak របស់អ្នក!"
                  : "Keep your streak!"
                : isKm
                  ? "ចាប់ផ្តើមសិក្សាថ្ងៃនេះ"
                  : "Start studying today"}
            </p>
            <p className="text-xs text-white/85 truncate">
              {unitDisplayName(activeUnit, isKm)}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0" />
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          setEditingPath(true);
          setObStarted(true);
          setObGrade(profile?.grade || null);
        }}
        className="text-xs font-semibold text-slate-500 hover:text-sky-600 px-1"
      >
        {isKm ? "កែផ្លូវសិក្សា" : "Edit learning path"}
      </button>

      {/* Unit path */}
      {pathError ? (
        <div className="py-10 text-center">
          <p className="text-sm text-slate-500 mb-3">{isKm ? "មិនអាចផ្ទុកមេរៀនបានទេ" : "Failed to load units"}</p>
          <button
            type="button"
            onClick={() => activeSubjectId && loadPath(activeSubjectId)}
            className="text-sm font-bold text-sky-600"
          >
            {isKm ? "ព្យាយាមម្តងទៀត" : "Retry"}
          </button>
        </div>
      ) : !path ? (
        <div className="py-10 flex justify-center">
          <RefreshCw className="w-5 h-5 animate-spin text-sky-500" />
        </div>
      ) : (
        <div className="space-y-0">
          {path.units.map((unit, index) => {
            const { accent, gradStart, gradEnd } = accentPair(index);
            const completed = unit.state === "completed";
            const locked = unit.state === "locked";
            const comingSoon = unit.state === "no_content";
            const isExpanded = expandedUnitId === unit.topicId;
            const isLast = index === path.units.length - 1;
            const Icon = UNIT_ICONS[index % UNIT_ICONS.length];

            return (
              <div key={unit.topicId} className="flex gap-3">
                {/* Timeline */}
                <div className="relative w-5 flex flex-col items-center">
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-[2.5px] bg-transparent z-10 mt-5 ${
                      isExpanded ? "scale-110" : ""
                    }`}
                    style={{ borderColor: accent }}
                  />
                  {!isLast && (
                    <div className="flex-1 w-0.5 bg-slate-200 dark:bg-slate-700 my-1" />
                  )}
                </div>

                <div className="flex-1 pb-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (locked || comingSoon) return;
                      setExpandedUnitId(isExpanded ? null : unit.topicId);
                    }}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left text-white shadow-md active:scale-[0.99] transition"
                    style={{
                      background: `linear-gradient(90deg, ${gradStart}, ${gradEnd})`,
                      opacity: locked || comingSoon ? 0.72 : 1,
                    }}
                  >
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0 shadow">
                      {completed ? (
                        <Check className="w-4 h-4" style={{ color: accent }} />
                      ) : (
                        <Icon className="w-4 h-4" style={{ color: accent }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{unitDisplayName(unit, isKm)}</p>
                      <p className="text-[11px] text-white/85">
                        {isKm ? `មេរៀនទី ${index + 1}` : `Unit ${index + 1}`} ·{" "}
                        {completed
                          ? isKm
                            ? "បានបញ្ចប់"
                            : "Completed"
                          : comingSoon
                            ? isKm
                              ? "មកដល់ឆាប់ៗ"
                              : "Coming soon"
                            : locked
                              ? isKm
                                ? "ជាប់សោ"
                                : "Locked"
                              : isKm
                                ? "កំពុងសិក្សា"
                                : "In progress"}
                      </p>
                    </div>
                    {locked || comingSoon ? (
                      <Lock className="w-4 h-4 shrink-0" />
                    ) : isExpanded ? (
                      <ChevronUp className="w-5 h-5 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 ml-2 space-y-1.5 border-l-2 pl-3" style={{ borderColor: `${accent}55` }}>
                      {unit.hasLesson && (
                        <button
                          type="button"
                          onClick={() => openUnit(unit)}
                          className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-left"
                        >
                          <BookOpen className="w-4 h-4 shrink-0" style={{ color: accent }} />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex-1">
                            {isKm ? "អានមេរៀនសង្ខេប" : "Read lesson summary"}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {unit.correct > 0 ? (isKm ? "រួច" : "Done") : ""}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                      )}
                      {buildPracticeSteps(unit, path?.subject?.grade).map((step) => {
                        const StepIcon = practiceStepIcon(step.icon);
                        const lockedStep = step.state === "locked";
                        const doneStep = step.state === "completed";
                        return (
                          <button
                            key={step.id}
                            type="button"
                            disabled={lockedStep}
                            onClick={() =>
                              openPractice(unit, {
                                minDifficulty: step.minDifficulty,
                                maxDifficulty: step.maxDifficulty,
                                title: isKm ? step.titleKh : step.titleEn,
                              })
                            }
                            className={`w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl border text-left transition ${
                              lockedStep
                                ? "bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-60"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <StepIcon
                              className="w-4 h-4 shrink-0"
                              style={{ color: doneStep ? "#10B981" : accent }}
                            />
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex-1">
                              {isKm ? step.titleKh : step.titleEn}
                              <span className="text-slate-400 font-medium">
                                {" "}
                                · {Math.min(unit.correct, step.targetVal)}/{step.targetVal}
                              </span>
                            </span>
                            {lockedStep ? (
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                            ) : doneStep ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Trophy */}
          <div className="flex gap-3">
            <div className="w-5 flex justify-center">
              <div className="w-3.5 h-3.5 rounded-full border-[2.5px] border-amber-400 mt-5" />
            </div>
            <div
              className={`flex-1 flex items-center gap-3 p-3.5 rounded-2xl border shadow-sm mb-2 ${
                allDone
                  ? "text-white border-transparent"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              }`}
              style={allDone ? { background: "linear-gradient(90deg, #FBBF24, #F59E0B)" } : undefined}
            >
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                <Trophy className={`w-4 h-4 ${allDone ? "text-amber-500" : "text-slate-400"}`} />
              </div>
              <span className={`text-sm font-bold flex-1 ${allDone ? "text-white" : "text-slate-500"}`}>
                {isKm ? "បញ្ចប់ផ្លូវសិក្សា" : "Finish the path"}
              </span>
              {allDone && <Check className="w-5 h-5 text-white" />}
            </div>
          </div>

          {/* Mixed review + exam */}
          <div className="space-y-2 pl-8">
            <Link
              href={`/${locale}/learn/path/practice?subjectId=${path.subject.id}&title=${encodeURIComponent(
                isKm ? "ពិនិត្យចម្រុះ" : "Mixed Review"
              )}&grade=${path.subject.grade}&subjectName=${encodeURIComponent(
                subjectDisplayName(path.subject, isKm)
              )}`}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Shuffle className="w-4 h-4 text-slate-500" />
              </div>
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex-1">
                {isKm ? "ពិនិត្យចម្រុះ" : "Mixed Review"}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
            {path.subject.code && (
              <Link
                href={`/${locale}/learn/path/exams?${new URLSearchParams({
                  courseCode: path.subject.code,
                  subjectName: subjectDisplayName(path.subject, false),
                  subjectNameKh: subjectDisplayName(path.subject, true),
                }).toString()}`}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                <div className="w-9 h-9 rounded-full bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-violet-500" />
                </div>
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex-1">
                  {isKm ? "ឯកសារប្រឡង" : "Exam Papers"}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Mini courses */}
      {topCourses.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isKm ? "វគ្គសិក្សា" : "Courses"}
            </h3>
            <Link href={`/${locale}/learn?hub=1`} className="text-xs font-bold text-sky-600">
              {isKm ? "មើលទាំងអស់" : "See all"}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {topCourses.map((c, i) => {
              const { gradStart, gradEnd } = accentPair(i);
              return (
                <Link
                  key={c.id}
                  href={`/${locale}/learn/course/${c.id}`}
                  className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm"
                >
                  <div
                    className="h-16 flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${gradStart}, ${gradEnd})` }}
                  >
                    <BookOpen className="w-6 h-6 text-white/90" />
                  </div>
                  <div className="p-2.5">
                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug">
                      {c.title}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
