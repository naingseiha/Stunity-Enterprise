"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Award,
  Check,
  Download,
  FileImage,
  FileText,
  ImageIcon,
  Loader2,
  Palette,
  RefreshCw,
  Settings2,
  Sparkles,
  Medal,
  ScrollText,
} from "lucide-react";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import CertificatePreview from "@/components/certificates/CertificatePreview";
import {
  CERTIFICATE_RATIOS,
  CERTIFICATE_TEMPLATES,
  type CertificateContentSettings,
  type CertificateRatioId,
  type CertificateTemplateId,
} from "@/components/certificates/types";
import { TokenManager } from "@/lib/api/auth";
import { schoolAPI } from "@/lib/api/school";
import {
  getPosterRecipients, // Reuse for now to get students
  type PosterScopeType,
} from "@/lib/api/reports";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { useClasses } from "@/hooks/useClasses";
import { canViewReportsDashboard } from "@/lib/permissions/reports";

// Reuse export logic from posterExport
import {
  downloadPosterImage,
  downloadPosterPdf,
  safePosterFileName,
} from "@/lib/export/posterExport";

const TEMPLATE_CARD_META = {
  "heritage-honors": {
    icon: Award,
    eyebrow: "បេតិកភណ្ឌខ្មែរ",
  },
  "clean-achievers": {
    icon: ScrollText,
    eyebrow: "សិក្សាអភិជន",
  },
  "modern-khmer-excellence": {
    icon: Sparkles,
    eyebrow: "ទំនើបសាមញ្ញ",
  },
  "angkor-laureates": {
    icon: Medal,
    eyebrow: "ឧត្តមភាពមាស",
  },
} satisfies Record<CertificateTemplateId, { icon: any; eyebrow: string }>;

export default function CertificateStudioPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(props.params);
  // Using posterStudio translations temporarily for common terms, and hardcoded for new ones
  const t = useTranslations("posterStudio"); 
  const router = useRouter();
  const { schoolId, currentYear, selectedYear } = useAcademicYear();
  const activeYear = selectedYear ?? currentYear;
  const canvasRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  const [scope, setScope] = useState<PosterScopeType>("class");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedGrade, setSelectedGrade] = useState("");

  const [template, setTemplate] = useState<CertificateTemplateId>("clean-achievers");
  const [ratioId, setRatioId] = useState<CertificateRatioId>("landscape");
  const [content, setContent] = useState<CertificateContentSettings>({
    title: "វិញ្ញាបនបត្របញ្ជាក់ការសិក្សា",
    subtitle: "សូមបញ្ជាក់ថា",
    principalName: "នាយកសាលា",
    teacherName: "គ្រូបន្ទុកថ្នាក់",
    issueDate: new Date().toLocaleDateString("km-KH"),
    showStudentId: true,
    showScores: false,
    showRanks: false,
  });

  const [posterData, setPosterData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"png" | "jpg" | "pdf" | null>(null);
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

  const ratio = CERTIFICATE_RATIOS.find((item) => item.id === ratioId) || CERTIFICATE_RATIOS[0];
  const currentTemplate = CERTIFICATE_TEMPLATES.find((item) => item.id === template) || CERTIFICATE_TEMPLATES[0];

  const totalRecipients =
    posterData?.groups?.reduce(
      (sum: number, group: any) => sum + group.recipients.length,
      0,
    ) || 0;

  const hasAccess = canViewReportsDashboard(user?.role);

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
  }, [locale, router]);

  useEffect(() => {
    if (selectedClassIds.length === 0 && classes.length > 0) {
      setSelectedClassIds([classes[0].id]);
    }
    if (!selectedGrade && grades.length > 0) setSelectedGrade(grades[0]);
  }, [classes, grades, selectedClassIds.length, selectedGrade]);

  const handleGenerate = async () => {
    if (!schoolId || !activeYear?.id) return;
    setLoading(true);
    setError(null);
    try {
      // Reusing poster generation endpoint just to fetch students for preview
      const result = await getPosterRecipients({
        schoolId,
        yearId: activeYear.id,
        period: "year",
        scope,
        classIds: scope === "class" ? selectedClassIds.slice(0, 1) : undefined,
        grade: scope === "grade" ? selectedGrade : undefined,
        groupBy: "class",
        limit: 5, // Just top 5 for preview to avoid overloading
        includeTies: false,
      });
      setPosterData(result);
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
        school?.name || "stunity",
        "certificate",
      );
      if (kind === "pdf")
        await downloadPosterPdf(
          canvasRef.current,
          fileName,
          ratio.width,
          ratio.height,
        );
      else
        await downloadPosterImage(
          canvasRef.current,
          fileName,
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
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-700 text-white shadow-lg shadow-indigo-500/20">
                  <ScrollText className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
                    CERTIFICATE STUDIO
                  </p>
                  <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
                    បង្កើតវិញ្ញាបនបត្រ
                  </h1>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                    បង្កើតវិញ្ញាបនបត្រដ៏ស្រស់ស្អាតសម្រាប់សិស្ស
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                  {ratio.width}×{ratio.height}px
                </span>
                <span className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                  {totalRecipients} {t("recipients")}
                </span>
                <button
                  onClick={() => handleExport("pdf")}
                  disabled={!posterData || exporting !== null}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  {exporting === "pdf" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}{" "}
                  Export PDF
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                      <Settings2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-950 dark:text-white">
                        {t("dataSettings")}
                      </p>
                      <p className="text-[11px] font-bold text-slate-400">
                        ជ្រើសរើសសិស្សសម្រាប់វិញ្ញាបនបត្រ
                      </p>
                    </div>
                  </div>

                  <label className="mt-5 block text-xs font-black text-slate-600 dark:text-gray-300">
                    {t("scope")}
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(["class", "grade"] as PosterScopeType[]).map((item) => (
                      <button
                        key={item}
                        onClick={() => setScope(item)}
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

                  <button
                    onClick={handleGenerate}
                    disabled={loading || !activeYear?.id}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 px-4 py-3 text-sm font-black text-white shadow-lg disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}{" "}
                    {loading ? t("generating") : "ទាញទិន្នន័យសិស្ស"}
                  </button>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-4 flex items-center gap-3">
                    <Palette className="h-5 w-5 text-indigo-600" />
                    <p className="text-sm font-black">{t("designSettings")}</p>
                  </div>
                  <label className="text-xs font-black text-slate-600 dark:text-gray-300">
                    {t("format")}
                  </label>
                  <div className="mt-2 grid gap-2 grid-cols-2">
                    {CERTIFICATE_RATIOS.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setRatioId(item.id)}
                        disabled={!currentTemplate.supportedRatios.includes(item.id)}
                        className={`flex flex-col items-center justify-center rounded-xl border px-3 py-3 text-center disabled:cursor-not-allowed disabled:opacity-35 ${ratioId === item.id ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/20" : "border-slate-200 dark:border-gray-700"}`}
                      >
                        <span className="text-xs font-black">{item.label.split("·")[0]}</span>
                      </button>
                    ))}
                  </div>

                  <label className="mt-5 block text-xs font-black text-slate-600 dark:text-gray-300">
                    {t("template")}
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {CERTIFICATE_TEMPLATES.map((item) => {
                      const meta = TEMPLATE_CARD_META[item.id];
                      const TemplateIcon = meta.icon;
                      const selected = template === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setTemplate(item.id);
                            if (!item.supportedRatios.includes(ratioId)) {
                              setRatioId(item.supportedRatios[0]);
                            }
                          }}
                          className={`group relative overflow-hidden rounded-2xl border text-left transition-all ${
                            selected
                              ? "border-indigo-500 bg-indigo-50/70 shadow-md ring-2 ring-indigo-200 dark:bg-indigo-950/20 dark:ring-indigo-900"
                              : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-950"
                          }`}
                        >
                          <div
                            className={`relative flex h-20 items-center justify-between overflow-hidden bg-gradient-to-br px-3 ${item.accent}`}
                          >
                            <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />
                            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/40 bg-white/90 text-slate-800 shadow-sm">
                              <TemplateIcon className="h-6 w-6" />
                            </div>
                          </div>
                          <div className="min-h-[94px] p-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[12px] font-black leading-5 text-slate-900 dark:text-white">
                                {item.name}
                              </p>
                              {selected && (
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                                  <Check className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </div>
                            <p className="mt-1.5 line-clamp-3 text-[10px] font-semibold leading-4 text-slate-500 dark:text-gray-400">
                              {item.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <label className="mt-5 block text-xs font-black text-slate-600 dark:text-gray-300">
                    ចំណងជើងវិញ្ញាបនបត្រ
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
                    អត្ថបទបន្ទាប់
                  </label>
                  <input
                    value={content.subtitle}
                    onChange={(event) =>
                      setContent((current) => ({
                        ...current,
                        subtitle: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950"
                  />

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-600 dark:text-gray-300">ហត្ថលេខាទី១ (នាយក)</label>
                      <input
                        value={content.principalName}
                        onChange={(event) => setContent(c => ({...c, principalName: event.target.value}))}
                        className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-600 dark:text-gray-300">ហត្ថលេខាទី២ (គ្រូ)</label>
                      <input
                        value={content.teacherName}
                        onChange={(event) => setContent(c => ({...c, teacherName: event.target.value}))}
                        className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950"
                      />
                    </div>
                  </div>
                </section>
              </aside>

              <section className="min-w-0 rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      ទិដ្ឋភាពបង្ហាញ
                    </h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                      {ratio.label}
                    </span>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-2xl bg-rose-50 p-6 text-center text-sm font-bold text-rose-600 dark:bg-rose-950/30">
                    {error}
                  </div>
                ) : (
                  <CertificatePreview
                    canvasRef={canvasRef}
                    data={posterData}
                    template={template}
                    width={ratio.width}
                    height={ratio.height}
                    content={content}
                    placeholderSchoolName={school?.nameKh || school?.nameKhmer || school?.name || "ឈ្មោះសាលា"}
                    academicYearLabel={activeYear?.name || "២០២៣-២០២៤"}
                  />
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
