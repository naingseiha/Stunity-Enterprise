"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Check,
  Download,
  FileImage,
  FileText,
  ImageIcon,
  Layers3,
  Loader2,
  Palette,
  RefreshCw,
  Settings2,
  Sparkles,
} from "lucide-react";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import PosterPreview from "@/components/posters/PosterPreview";
import {
  POSTER_RATIOS,
  POSTER_TEMPLATES,
  type PosterContentSettings,
  type PosterRatioId,
  type PosterTemplateId,
} from "@/components/posters/types";
import { TokenManager } from "@/lib/api/auth";
import { schoolAPI } from "@/lib/api/school";
import { SCHOOL_SERVICE_URL, STUDENT_SERVICE_URL } from "@/lib/api/config";
import {
  getPosterRecipients,
  type PosterGroupBy,
  type PosterRecipientsResponse,
  type PosterScopeType,
  type ReportPeriodType,
} from "@/lib/api/reports";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { useClasses } from "@/hooks/useClasses";
import { canViewReportsDashboard } from "@/lib/permissions/reports";
import {
  KHMER_MONTHS,
  getKhmerMonthDisplayName,
} from "@/lib/reports/templates/khm-moeys/months";
import {
  downloadPosterImage,
  downloadPosterPdf,
  safePosterFileName,
} from "@/lib/export/posterExport";

function resolveAssetUrl(value: string | null, baseUrl: string) {
  if (!value) return null;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return `${baseUrl}${value.startsWith("/") ? value : `/${value}`}`;
}

function hydratePosterAssetUrls(
  data: PosterRecipientsResponse,
): PosterRecipientsResponse {
  return {
    ...data,
    school: {
      ...data.school,
      logo: resolveAssetUrl(data.school.logo, SCHOOL_SERVICE_URL),
    },
    groups: data.groups.map((group) => ({
      ...group,
      recipients: group.recipients.map((recipient) => ({
        ...recipient,
        photoUrl: resolveAssetUrl(recipient.photoUrl, STUDENT_SERVICE_URL),
      })),
    })),
  };
}

export default function PosterStudioPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(props.params);
  const t = useTranslations("posterStudio");
  const router = useRouter();
  const { schoolId, currentYear, selectedYear } = useAcademicYear();
  const activeYear = selectedYear ?? currentYear;
  const canvasRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  const [period, setPeriod] = useState<ReportPeriodType>("month");
  const [monthNumber, setMonthNumber] = useState(new Date().getMonth() + 1);
  const [semester, setSemester] = useState<"1" | "2">("1");
  const [scope, setScope] = useState<PosterScopeType>("class");
  const [groupBy, setGroupBy] = useState<PosterGroupBy>("class");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [limitPreset, setLimitPreset] = useState("5");
  const [customLimit, setCustomLimit] = useState(12);
  const [includeTies, setIncludeTies] = useState(true);

  const [template, setTemplate] = useState<PosterTemplateId>("clean-achievers");
  const [ratioId, setRatioId] = useState<PosterRatioId>("portrait");
  const [content, setContent] = useState<PosterContentSettings>({
    title: t("defaultTitle"),
    subtitle: "",
    showScores: true,
    showRanks: true,
    showClassNames: true,
  });

  const [posterData, setPosterData] = useState<PosterRecipientsResponse | null>(
    null,
  );
  const [posterPage, setPosterPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"png" | "jpg" | "pdf" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const { classes, isLoading: classesLoading } = useClasses({
    academicYearId: activeYear?.id,
    limit: 300,
  });
  const grades = useMemo(
    () =>
      Array.from(
        new Set(classes.map((classItem) => String(classItem.grade))),
      ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [classes],
  );
  const ratio =
    POSTER_RATIOS.find((item) => item.id === ratioId) || POSTER_RATIOS[0];
  const currentTemplate =
    POSTER_TEMPLATES.find((item) => item.id === template) ||
    POSTER_TEMPLATES[0];
  const limit =
    limitPreset === "custom"
      ? Math.min(50, Math.max(1, customLimit))
      : Number(limitPreset);
  const totalRecipients =
    posterData?.groups.reduce(
      (sum, group) => sum + group.recipients.length,
      0,
    ) || 0;
  const recipientPageCapacity =
    template === "clean-achievers" && ratioId !== "landscape" ? 5 : 10;
  const posterPages = useMemo(() => {
    if (!posterData) return [];

    const pages: PosterRecipientsResponse[] = [];
    let pageGroups: PosterRecipientsResponse["groups"] = [];
    let pageRecipientCount = 0;

    const finishPage = () => {
      if (pageGroups.length === 0) return;
      pages.push({ ...posterData, groups: pageGroups });
      pageGroups = [];
      pageRecipientCount = 0;
    };

    posterData.groups.forEach((group) => {
      let recipientOffset = 0;
      while (recipientOffset < group.recipients.length) {
        if (pageRecipientCount === recipientPageCapacity) finishPage();

        const availableSlots = recipientPageCapacity - pageRecipientCount;
        const recipients = group.recipients.slice(
          recipientOffset,
          recipientOffset + availableSlots,
        );
        pageGroups.push({
          ...group,
          id:
            recipientOffset === 0
              ? group.id
              : `${group.id}-part-${recipientOffset}`,
          recipients,
        });
        recipientOffset += recipients.length;
        pageRecipientCount += recipients.length;

        if (pageRecipientCount === recipientPageCapacity) finishPage();
      }
    });

    finishPage();
    return pages.length > 0 ? pages : [posterData];
  }, [posterData, recipientPageCapacity]);
  const posterPageCount = Math.max(1, posterPages.length);
  const visiblePosterData =
    posterPages[Math.min(posterPage, posterPageCount - 1)] || posterData;
  const hasAccess = canViewReportsDashboard(user?.role);

  const academicStartYear = useMemo(() => {
    const parsed = activeYear?.name
      ? Number.parseInt(activeYear.name.split("-")[0], 10)
      : Number.NaN;
    return Number.isFinite(parsed) ? parsed : new Date().getFullYear();
  }, [activeYear?.name]);

  useEffect(() => {
    setIsClient(true);
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    const userData = TokenManager.getUserData();
    setUser(userData.user);
    setSchool(userData.school);
    if (userData.school?.id) {
      schoolAPI
        .getProfile(userData.school.id)
        .then((profile) => {
          if (profile)
            setSchool((previous: any) => ({ ...previous, ...profile }));
        })
        .catch(() => undefined);
    }
  }, [locale, router]);

  useEffect(() => {
    if (selectedClassIds.length === 0 && classes.length > 0) {
      setSelectedClassIds([classes[0].id]);
    }
    if (!selectedGrade && grades.length > 0) setSelectedGrade(grades[0]);
  }, [classes, grades, selectedClassIds.length, selectedGrade]);

  useEffect(() => {
    setPosterPage(0);
  }, [posterData, recipientPageCapacity]);

  const handleScopeChange = (nextScope: PosterScopeType) => {
    setScope(nextScope);
    if (nextScope === "class" || nextScope === "multiClass")
      setGroupBy("class");
    else if (nextScope === "grade") setGroupBy("none");
    else setGroupBy("grade");
    if (nextScope === "class" && selectedClassIds.length > 1)
      setSelectedClassIds(selectedClassIds.slice(0, 1));
  };

  const toggleClass = (classId: string) => {
    setSelectedClassIds((current) =>
      current.includes(classId)
        ? current.filter((id) => id !== classId)
        : [...current, classId],
    );
  };

  const handleGenerate = async () => {
    if (!schoolId || !activeYear?.id) return;
    if (
      (scope === "class" || scope === "multiClass") &&
      selectedClassIds.length === 0
    ) {
      setError(t("selectClassError"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const calendarYear =
        monthNumber >= 11 ? academicStartYear : academicStartYear + 1;
      const result = await getPosterRecipients({
        schoolId,
        yearId: activeYear.id,
        period,
        semester,
        monthNumber: period === "month" ? monthNumber : undefined,
        year: period === "month" ? calendarYear : undefined,
        scope,
        classIds:
          scope === "class"
            ? selectedClassIds.slice(0, 1)
            : scope === "multiClass"
              ? selectedClassIds
              : undefined,
        grade: scope === "grade" ? selectedGrade : undefined,
        groupBy,
        limit,
        includeTies,
      });
      const hydrated = hydratePosterAssetUrls(result);
      const nextPeriodLabel =
        hydrated.period.khmerLabel || hydrated.period.label;
      const previousPeriodLabel = posterData
        ? posterData.period.khmerLabel || posterData.period.label
        : "";
      setPosterData(hydrated);
      setContent((current) => ({
        ...current,
        subtitle:
          !current.subtitle || current.subtitle === previousPeriodLabel
            ? nextPeriodLabel
            : current.subtitle,
      }));
    } catch (generationError: any) {
      setError(generationError?.message || t("generateError"));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (kind: "png" | "jpg" | "pdf") => {
    if (!canvasRef.current || !posterData) return;
    setExporting(kind);
    setError(null);
    try {
      const fileName = safePosterFileName(
        posterData.school.name || school?.name || "stunity",
        posterData.period.khmerLabel || posterData.period.label,
      );
      const pagedFileName =
        posterPageCount > 1 ? `${fileName}-page-${posterPage + 1}` : fileName;
      if (kind === "pdf")
        await downloadPosterPdf(
          canvasRef.current,
          pagedFileName,
          ratio.width,
          ratio.height,
        );
      else
        await downloadPosterImage(
          canvasRef.current,
          pagedFileName,
          ratio.width,
          ratio.height,
          kind,
        );
    } catch (exportError: any) {
      setError(exportError?.message || t("exportError"));
    } finally {
      setExporting(null);
    }
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-gray-950">
      <UnifiedNavigation user={user} school={school} />
      <main className="min-h-screen lg:ml-64">
        <div className="mx-auto max-w-[1800px] px-4 py-5 sm:px-6 lg:px-8">
          <header className="mb-6 overflow-hidden rounded-[30px] border border-slate-200 bg-white px-6 py-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:px-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-amber-500/20">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-600">
                    {t("eyebrow")}
                  </p>
                  <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
                    {t("title")}
                  </h1>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                    {t("description")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                  {ratio.width}×{ratio.height}px
                </span>
                <span className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  {totalRecipients} {t("recipients")}
                </span>
                <button
                  onClick={() => handleExport("png")}
                  disabled={!posterData || exporting !== null}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40 dark:bg-white dark:text-slate-950"
                >
                  {exporting === "png" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileImage className="h-4 w-4" />
                  )}{" "}
                  PNG
                </button>
                <button
                  onClick={() => handleExport("jpg")}
                  disabled={!posterData || exporting !== null}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-800 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  {exporting === "jpg" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}{" "}
                  JPG
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  disabled={!posterData || exporting !== null}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-800 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  {exporting === "pdf" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}{" "}
                  PDF
                </button>
              </div>
            </div>
          </header>

          {!hasAccess ? (
            <section className="rounded-[30px] border border-rose-200 bg-rose-50 p-12 text-center font-black text-rose-700">
              {t("accessDenied")}
            </section>
          ) : (
            <div className="grid items-start gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
              <aside className="space-y-5 xl:sticky xl:top-5">
                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
                      <Settings2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-950 dark:text-white">
                        {t("dataSettings")}
                      </p>
                      <p className="text-[11px] font-bold text-slate-400">
                        {t("dataSettingsHint")}
                      </p>
                    </div>
                  </div>

                  <label className="text-xs font-black text-slate-600 dark:text-gray-300">
                    {t("period")}
                  </label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(["month", "semester", "year"] as ReportPeriodType[]).map(
                      (item) => (
                        <button
                          key={item}
                          onClick={() => setPeriod(item)}
                          className={`rounded-xl px-2 py-2 text-xs font-black ${period === item ? "bg-cyan-950 text-white dark:bg-cyan-500" : "bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-400"}`}
                        >
                          {item === "month"
                            ? t("monthly")
                            : item === "semester"
                              ? t("semester")
                              : t("yearly")}
                        </button>
                      ),
                    )}
                  </div>

                  {period === "month" && (
                    <select
                      value={monthNumber}
                      onChange={(event) =>
                        setMonthNumber(Number(event.target.value))
                      }
                      className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950"
                    >
                      {KHMER_MONTHS.map((month) => (
                        <option key={month.number} value={month.number}>
                          {getKhmerMonthDisplayName(month.number, month.label)}
                        </option>
                      ))}
                    </select>
                  )}
                  {period === "semester" && (
                    <select
                      value={semester}
                      onChange={(event) =>
                        setSemester(event.target.value as "1" | "2")
                      }
                      className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950"
                    >
                      <option value="1">{t("semester1")}</option>
                      <option value="2">{t("semester2")}</option>
                    </select>
                  )}

                  <label className="mt-5 block text-xs font-black text-slate-600 dark:text-gray-300">
                    {t("scope")}
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(
                      [
                        "class",
                        "multiClass",
                        "grade",
                        "school",
                      ] as PosterScopeType[]
                    ).map((item) => (
                      <button
                        key={item}
                        onClick={() => handleScopeChange(item)}
                        className={`rounded-xl px-3 py-2.5 text-xs font-black ${scope === item ? "bg-indigo-950 text-white dark:bg-indigo-500" : "bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-400"}`}
                      >
                        {t(`scope_${item}`)}
                      </button>
                    ))}
                  </div>

                  {scope === "class" && (
                    <select
                      value={selectedClassIds[0] || ""}
                      onChange={(event) =>
                        setSelectedClassIds(
                          event.target.value ? [event.target.value] : [],
                        )
                      }
                      disabled={classesLoading}
                      className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950"
                    >
                      <option value="">{t("chooseClass")}</option>
                      {classes.map((classItem) => (
                        <option key={classItem.id} value={classItem.id}>
                          {classItem.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {scope === "multiClass" && (
                    <div className="mt-3 max-h-44 space-y-1.5 overflow-auto rounded-xl border border-slate-200 p-2 dark:border-gray-700">
                      {classes.map((classItem) => {
                        const selected = selectedClassIds.includes(
                          classItem.id,
                        );
                        return (
                          <button
                            key={classItem.id}
                            onClick={() => toggleClass(classItem.id)}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-bold ${selected ? "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200" : "hover:bg-slate-50 dark:hover:bg-gray-800"}`}
                          >
                            <span>{classItem.name}</span>
                            {selected && <Check className="h-4 w-4" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {scope === "grade" && (
                    <select
                      value={selectedGrade}
                      onChange={(event) => setSelectedGrade(event.target.value)}
                      className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950"
                    >
                      {grades.map((grade) => (
                        <option key={grade} value={grade}>
                          {t("gradeLabel")} {grade}
                        </option>
                      ))}
                    </select>
                  )}

                  {scope === "school" && (
                    <select
                      value={groupBy}
                      onChange={(event) =>
                        setGroupBy(event.target.value as PosterGroupBy)
                      }
                      className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950"
                    >
                      <option value="grade">{t("groupByGrade")}</option>
                      <option value="class">{t("groupByClass")}</option>
                      <option value="none">{t("groupAsSchool")}</option>
                    </select>
                  )}

                  <label className="mt-5 block text-xs font-black text-slate-600 dark:text-gray-300">
                    {t("rankingCount")}
                  </label>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {["3", "5", "10", "custom"].map((item) => (
                      <button
                        key={item}
                        onClick={() => setLimitPreset(item)}
                        className={`rounded-xl px-2 py-2 text-xs font-black ${limitPreset === item ? "bg-amber-500 text-slate-950" : "bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-400"}`}
                      >
                        {item === "custom" ? t("custom") : `Top ${item}`}
                      </button>
                    ))}
                  </div>
                  {limitPreset === "custom" && (
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={customLimit}
                      onChange={(event) =>
                        setCustomLimit(Number(event.target.value))
                      }
                      className="mt-3 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950"
                    />
                  )}

                  <label className="mt-4 flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 px-3 py-3 dark:bg-gray-800/70">
                    <span>
                      <span className="block text-xs font-black">
                        {t("includeTies")}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-bold text-slate-400">
                        {t("includeTiesHint")}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={includeTies}
                      onChange={(event) => setIncludeTies(event.target.checked)}
                      className="h-4 w-4"
                    />
                  </label>

                  <button
                    onClick={handleGenerate}
                    disabled={loading || !activeYear?.id}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-950 to-indigo-950 px-4 py-3 text-sm font-black text-white shadow-lg disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}{" "}
                    {loading ? t("generating") : t("generate")}
                  </button>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-4 flex items-center gap-3">
                    <Palette className="h-5 w-5 text-fuchsia-600" />
                    <p className="text-sm font-black">{t("designSettings")}</p>
                  </div>
                  <label className="text-xs font-black text-slate-600 dark:text-gray-300">
                    {t("format")}
                  </label>
                  <div className="mt-2 grid gap-2">
                    {POSTER_RATIOS.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setRatioId(item.id)}
                        disabled={
                          !currentTemplate.supportedRatios.includes(item.id)
                        }
                        className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-35 ${ratioId === item.id ? "border-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-950/20" : "border-slate-200 dark:border-gray-700"}`}
                      >
                        <span className="text-xs font-black">{item.label}</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {item.width}×{item.height}
                        </span>
                      </button>
                    ))}
                  </div>

                  <label className="mt-5 block text-xs font-black text-slate-600 dark:text-gray-300">
                    {t("template")}
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {POSTER_TEMPLATES.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setTemplate(item.id);
                          if (!item.supportedRatios.includes(ratioId)) {
                            setRatioId(item.supportedRatios[0]);
                          }
                        }}
                        disabled={
                          (posterData?.groups.length || 0) > 1 &&
                          !item.supportsGroups
                        }
                        className={`overflow-hidden rounded-xl border text-left disabled:cursor-not-allowed disabled:opacity-40 ${template === item.id ? "border-fuchsia-500 ring-2 ring-fuchsia-200 dark:ring-fuchsia-900" : "border-slate-200 dark:border-gray-700"}`}
                      >
                        <div
                          className={`h-12 bg-gradient-to-br ${item.accent}`}
                        />
                        <div className="p-2">
                          <p className="text-[11px] font-black leading-tight">
                            {item.name}
                          </p>
                          <p className="mt-1 line-clamp-2 text-[9px] font-medium leading-tight text-slate-400">
                            {item.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <label className="mt-5 block text-xs font-black text-slate-600 dark:text-gray-300">
                    {t("posterTitle")}
                  </label>
                  <input
                    value={content.title}
                    onChange={(event) =>
                      setContent((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950"
                  />
                  <label className="mt-4 block text-xs font-black text-slate-600 dark:text-gray-300">
                    {t("subtitle")}
                  </label>
                  <input
                    value={content.subtitle}
                    onChange={(event) =>
                      setContent((current) => ({
                        ...current,
                        subtitle: event.target.value,
                      }))
                    }
                    placeholder={t("subtitlePlaceholder")}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950"
                  />

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {(
                      [
                        ["showRanks", "showRanks"],
                        ["showScores", "showScores"],
                        ["showClasses", "showClassNames"],
                      ] as const
                    ).map(([label, key]) => (
                      <label
                        key={key}
                        className="flex cursor-pointer flex-col items-center gap-2 rounded-xl bg-slate-50 p-2 text-center dark:bg-gray-800"
                      >
                        <input
                          type="checkbox"
                          checked={content[key]}
                          onChange={(event) =>
                            setContent((current) => ({
                              ...current,
                              [key]: event.target.checked,
                            }))
                          }
                        />
                        <span className="text-[10px] font-black">
                          {t(label)}
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              </aside>

              <section className="min-w-0 rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Layers3 className="h-5 w-5 text-indigo-600" />
                    <div>
                      <p className="text-sm font-black">{t("preview")}</p>
                      <p className="text-[11px] font-bold text-slate-400">
                        {t("previewHint")}
                      </p>
                    </div>
                  </div>
                  {posterData && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                      {posterData.groups.length} {t("groups")} ·{" "}
                      {totalRecipients} {t("recipients")}
                    </span>
                  )}
                </div>
                {error && (
                  <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                    {error}
                  </div>
                )}
                <PosterPreview
                  canvasRef={canvasRef}
                  data={visiblePosterData}
                  template={template}
                  width={ratio.width}
                  height={ratio.height}
                  content={content}
                  placeholderSchoolName={school?.name || t("schoolPlaceholder")}
                  academicYearLabel={activeYear?.name || ""}
                />
                {posterPageCount > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-gray-800">
                    <button
                      onClick={() =>
                        setPosterPage((current) => Math.max(0, current - 1))
                      }
                      disabled={posterPage === 0}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black disabled:opacity-40 dark:border-gray-700"
                    >
                      {t("previousPage")}
                    </button>
                    <span className="text-xs font-black text-slate-600 dark:text-gray-300">
                      {t("page")} {posterPage + 1} / {posterPageCount}
                    </span>
                    <button
                      onClick={() =>
                        setPosterPage((current) =>
                          Math.min(posterPageCount - 1, current + 1),
                        )
                      }
                      disabled={posterPage >= posterPageCount - 1}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black disabled:opacity-40 dark:border-gray-700"
                    >
                      {t("nextPage")}
                    </button>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={() => handleExport("png")}
                    disabled={!posterData || exporting !== null}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-black text-white disabled:opacity-40"
                  >
                    <Download className="h-4 w-4" /> {t("downloadPng")}
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
