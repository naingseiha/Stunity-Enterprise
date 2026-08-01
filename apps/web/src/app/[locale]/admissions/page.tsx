"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  X,
  ClipboardCheck,
  UserPlus,
  Users,
  Clock3,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Eye,
} from "lucide-react";
import { TokenManager } from "@/lib/api/auth";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import { useAcademicYearsList } from "@/hooks/useAcademicYears";
import { useClasses } from "@/hooks/useClasses";
import { getStudents, type Student } from "@/lib/api/students";
import {
  createAdmissionApplication,
  enrollAdmission,
  getAdmissionApplication,
  getAdmissionApplications,
  getAdmissionSummary,
  updateAdmissionStatus,
  type AdmissionApplication,
  type AdmissionInput,
  type AdmissionStatus,
} from "@/lib/api/admissions";

const STATUS_COLORS: Record<AdmissionStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  RECEIVED: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  UNDER_REVIEW:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  WAITLISTED:
    "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  APPROVED:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  ENROLLED: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
  WITHDRAWN:
    "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

export default function AdmissionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const km = locale.startsWith("km");
  const l = (en: string, kh: string) => (km ? kh : en);
  const router = useRouter();
  const { school, user } = TokenManager.getUserData();
  const canReview = ["ADMIN", "SUPER_ADMIN", "STAFF", "SCHOOL_ADMIN"].includes(
    user?.role || "",
  );
  const { years, isLoading: yearsLoading } = useAcademicYearsList(school?.id);
  const [academicYearId, setAcademicYearId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [applicantType, setApplicantType] = useState("");
  const [page, setPage] = useState(1);
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });
  const [summary, setSummary] = useState<any>({
    total: 0,
    byStatus: {},
    byType: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [enrollmentApplication, setEnrollmentApplication] =
    useState<AdmissionApplication | null>(null);
  const [detailApplication, setDetailApplication] =
    useState<AdmissionApplication | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState("");
  const [actingId, setActingId] = useState("");

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  useEffect(() => {
    if (!academicYearId && years.length)
      setAcademicYearId((years.find((year) => year.isCurrent) || years[0]).id);
  }, [academicYearId, years]);

  const load = useCallback(async () => {
    if (!academicYearId) return;
    setLoading(true);
    setError("");
    try {
      const [list, totals] = await Promise.all([
        getAdmissionApplications({
          page,
          limit: 25,
          academicYearId,
          search: search.trim().length >= 2 ? search.trim() : undefined,
          status,
          applicantType,
        }),
        getAdmissionSummary(academicYearId),
      ]);
      setApplications(list.data.applications);
      setPagination(list.data.pagination);
      setSummary(totals.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [academicYearId, applicantType, page, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(load, 220);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => setPage(1), [academicYearId, applicantType, search, status]);

  const act = async (
    application: AdmissionApplication,
    next: AdmissionStatus,
  ) => {
    let notes: string | undefined;
    if (next === "REJECTED") {
      notes = window
        .prompt(
          l(
            "Reason for rejection (required)",
            "មូលហេតុបដិសេធ (តម្រូវឱ្យបំពេញ)",
          ),
        )
        ?.trim();
      if (!notes) return;
    }
    setActingId(application.id);
    setError("");
    try {
      await updateAdmissionStatus(application.id, next, notes);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActingId("");
    }
  };

  const enroll = async (
    application: AdmissionApplication,
    options: { classId?: string; leaveUnassigned?: boolean },
  ) => {
    setActingId(application.id);
    setError("");
    try {
      await enrollAdmission(application.id, options);
      setEnrollmentApplication(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActingId("");
    }
  };

  const openApplication = async (application: AdmissionApplication) => {
    setDetailLoadingId(application.id);
    setError("");
    try {
      const response = await getAdmissionApplication(application.id);
      setDetailApplication(response.data.application);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDetailLoadingId("");
    }
  };

  const cards = [
    {
      label: l("Total applications", "ពាក្យសរុប"),
      value: summary.total || 0,
      icon: ClipboardCheck,
      tone: "text-blue-600 bg-blue-50 dark:bg-blue-500/10",
    },
    {
      label: l("New students", "សិស្សថ្មី"),
      value: summary.byType?.NEW_STUDENT || 0,
      icon: UserPlus,
      tone: "text-violet-600 bg-violet-50 dark:bg-violet-500/10",
    },
    {
      label: l("Returning students", "សិស្សចាស់"),
      value: summary.byType?.RETURNING_STUDENT || 0,
      icon: Users,
      tone: "text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10",
    },
    {
      label: l("Needs review", "រង់ចាំពិនិត្យ"),
      value:
        (summary.byStatus?.RECEIVED || 0) +
        (summary.byStatus?.UNDER_REVIEW || 0),
      icon: Clock3,
      tone: "text-amber-600 bg-amber-50 dark:bg-amber-500/10",
    },
    {
      label: l("Enrolled", "បានចុះឈ្មោះ"),
      value: summary.byStatus?.ENROLLED || 0,
      icon: CheckCircle2,
      tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10",
    },
    {
      label: l("Awaiting class", "មិនទាន់ចាត់ថ្នាក់"),
      value: summary.awaitingPlacement || 0,
      icon: AlertCircle,
      tone: "text-orange-600 bg-orange-50 dark:bg-orange-500/10",
    },
  ];

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
      <div className="min-h-screen bg-gray-50 transition-colors duration-500 dark:bg-gray-950 lg:ml-64">
        <main className="mx-auto max-w-7xl space-y-8 px-4 pb-12 pt-4 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-400 sm:h-14 sm:w-14">
                  <ClipboardCheck className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[.22em] text-blue-600 dark:text-blue-400">
                    {l("Admissions workspace", "មជ្ឈមណ្ឌលទទួលពាក្យ")}
                  </p>
                  <h1 className="mt-1.5 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                    {l("Student Admissions", "ការចុះឈ្មោះចូលរៀន")}
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                    {l(
                      "Receive, review and convert approved applications into official student records.",
                      "ទទួល ពិនិត្យ និងបម្លែងពាក្យដែលបានអនុម័តទៅជាកំណត់ត្រាសិស្សផ្លូវការ។",
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-5 py-3 text-sm font-black text-white transition-colors hover:border-blue-700 hover:bg-blue-700 sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                {l("Receive application", "ទទួលពាក្យថ្មី")}
              </button>
            </div>
          </section>

          <section className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-6">
            {cards.map(({ label, value, icon: Icon, tone }) => (
              <div
                key={label}
                className="min-w-[170px] snap-start rounded-3xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300 sm:min-w-0 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`rounded-2xl border border-current/10 p-3 ${tone}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="mt-1 h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-700" />
                </div>
                <p className="mt-5 text-3xl font-black tracking-tight text-slate-900 tabular-nums dark:text-white">
                  {value}
                </p>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">
                  {label}
                </p>
              </div>
            ))}
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
              <div className="mb-5 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[.22em] text-blue-600 dark:text-blue-400">
                    {l("Application register", "បញ្ជីទទួលពាក្យ")}
                  </p>
                  <h2 className="mt-1.5 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                    {l("Manage applications", "គ្រប់គ្រងពាក្យចូលរៀន")}
                  </h2>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {pagination.total} {l("records", "ពាក្យ")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <label className="relative col-span-2 md:col-span-1">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={l(
                      "Search name, ID, phone…",
                      "ស្វែងរកឈ្មោះ លេខសម្គាល់ ទូរសព្ទ…",
                    )}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium outline-none transition-colors focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-500"
                  />
                </label>
                <select
                  value={academicYearId}
                  onChange={(e) => setAcademicYearId(e.target.value)}
                  disabled={yearsLoading}
                  className="h-12 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">{l("Academic year", "ឆ្នាំសិក្សា")}</option>
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                      {y.isCurrent ? ` — ${l("Current", "បច្ចុប្បន្ន")}` : ""}
                    </option>
                  ))}
                </select>
                <select
                  value={applicantType}
                  onChange={(e) => setApplicantType(e.target.value)}
                  className="h-12 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">
                    {l("All applicant types", "ប្រភេទបេក្ខជនទាំងអស់")}
                  </option>
                  <option value="NEW_STUDENT">
                    {l("New student", "សិស្សថ្មី")}
                  </option>
                  <option value="RETURNING_STUDENT">
                    {l("Returning student", "សិស្សចាស់")}
                  </option>
                </select>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="col-span-2 h-12 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-blue-500 md:col-span-1 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">
                    {l("All statuses", "ស្ថានភាពទាំងអស់")}
                  </option>
                  {(
                    [
                      "RECEIVED",
                      "UNDER_REVIEW",
                      "WAITLISTED",
                      "APPROVED",
                      "REJECTED",
                      "ENROLLED",
                      "WITHDRAWN",
                    ] as AdmissionStatus[]
                  ).map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s, km)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {error && (
              <div className="m-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            <div className="space-y-3 p-3 lg:hidden">
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-gray-800"
                  />
                ))
              ) : applications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-14 text-center dark:border-gray-700">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-gray-800">
                    <ClipboardCheck className="h-6 w-6" />
                  </span>
                  <p className="mt-4 font-black text-slate-800 dark:text-white">
                    {l("No applications found", "មិនមានពាក្យចូលរៀន")}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {l(
                      "Try changing the filters or receive a new application.",
                      "សូមប្តូរលក្ខខណ្ឌស្វែងរក ឬទទួលពាក្យថ្មី។",
                    )}
                  </p>
                </div>
              ) : (
                applications.map((application, index) => (
                  <article
                    key={application.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.16em] text-slate-400">
                          <span>{(page - 1) * 25 + index + 1}</span>
                          <span className="h-1 w-1 rounded-full bg-slate-300" />
                          <span className="truncate">
                            {application.applicationNumber}
                          </span>
                        </div>
                        <h3 className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                          {application.lastName} {application.firstName}
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {application.student?.studentId ||
                            application.phoneNumber ||
                            l("No contact number", "គ្មានលេខទំនាក់ទំនង")}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${STATUS_COLORS[application.status]}`}
                      >
                        {statusLabel(application.status, km)}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {l("Applicant", "ប្រភេទសិស្ស")}
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-700 dark:text-gray-200">
                          {application.applicantType === "RETURNING_STUDENT"
                            ? l("Returning student", "សិស្សចាស់")
                            : l("New student", "សិស្សថ្មី")}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {l("Placement", "ការចាត់ថ្នាក់")}
                        </p>
                        <p className="mt-1 truncate text-sm font-bold text-slate-700 dark:text-gray-200">
                          {application.status === "ENROLLED" &&
                          !application.targetClass
                            ? l("Awaiting class", "រង់ចាំចាត់ថ្នាក់")
                            : application.targetClass?.name ||
                              application.requestedGrade ||
                              l("Decide later", "សម្រេចពេលក្រោយ")}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-gray-800">
                      <button
                        onClick={() => openApplication(application)}
                        disabled={detailLoadingId === application.id}
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
                      >
                        {detailLoadingId === application.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        {l("View", "មើលពាក្យ")}
                      </button>
                      {actingId === application.id ? (
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-600" />
                      ) : (
                        <>
                          {canReview &&
                            application.applicantType === "NEW_STUDENT" &&
                            application.status === "RECEIVED" && (
                              <button
                                onClick={() => act(application, "UNDER_REVIEW")}
                                className="min-h-10 flex-1 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-700 dark:border-gray-700 dark:text-gray-200"
                              >
                                {l("Review", "ពិនិត្យ")}
                              </button>
                            )}
                          {canReview &&
                            ["RECEIVED", "UNDER_REVIEW", "WAITLISTED"].includes(
                              application.status,
                            ) &&
                            application.applicantType === "NEW_STUDENT" && (
                              <button
                                onClick={() => act(application, "APPROVED")}
                                className="min-h-10 flex-1 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white"
                              >
                                {l("Approve", "អនុម័ត")}
                              </button>
                            )}
                          {canReview &&
                            ["RECEIVED", "UNDER_REVIEW", "WAITLISTED"].includes(
                              application.status,
                            ) &&
                            application.applicantType === "NEW_STUDENT" && (
                              <button
                                onClick={() => act(application, "REJECTED")}
                                className="min-h-10 rounded-xl bg-red-50 px-3 text-xs font-black text-red-700 dark:bg-red-500/10 dark:text-red-300"
                              >
                                {l("Reject", "បដិសេធ")}
                              </button>
                            )}
                          {canReview && application.status === "APPROVED" && (
                            <button
                              onClick={() =>
                                setEnrollmentApplication(application)
                              }
                              className="min-h-11 w-full rounded-xl border border-blue-600 bg-blue-600 px-4 text-sm font-black text-white transition-colors hover:border-blue-700 hover:bg-blue-700"
                            >
                              {l("Admit student", "ទទួលជាសិស្ស")}
                            </button>
                          )}
                          {application.applicantType === "RETURNING_STUDENT" &&
                            application.status === "RECEIVED" && (
                              <span className="w-full rounded-xl bg-cyan-50 px-3 py-2 text-center text-xs font-black text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
                                {l(
                                  "Application receipt recorded",
                                  "បានកត់ត្រាការទទួលពាក្យ",
                                )}
                              </span>
                            )}
                        </>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-gray-950/50 dark:text-gray-400">
                  <tr>
                    <th className="px-5 py-4">{l("No.", "ល.រ")}</th>
                    <th className="px-5 py-4">{l("Application", "ពាក្យ")}</th>
                    <th className="px-5 py-4">{l("Applicant", "បេក្ខជន")}</th>
                    <th className="px-5 py-4">{l("Type", "ប្រភេទ")}</th>
                    <th className="px-5 py-4">
                      {l("Requested placement", "ថ្នាក់ស្នើសុំ")}
                    </th>
                    <th className="px-5 py-4">{l("Status", "ស្ថានភាព")}</th>
                    <th className="px-5 py-4 text-right">
                      {l("Actions", "សកម្មភាព")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-600" />
                      </td>
                    </tr>
                  ) : applications.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-20 text-center text-slate-500"
                      >
                        {l(
                          "No applications match these filters.",
                          "មិនមានពាក្យដែលត្រូវនឹងលក្ខខណ្ឌនេះទេ។",
                        )}
                      </td>
                    </tr>
                  ) : (
                    applications.map((application, index) => (
                      <tr
                        key={application.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-gray-800/30"
                      >
                        <td className="px-5 py-4 font-bold text-slate-400">
                          {(page - 1) * 25 + index + 1}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-black text-slate-900 dark:text-white">
                            {application.applicationNumber}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(application.createdAt).toLocaleDateString(
                              km ? "km-KH" : "en-GB",
                            )}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {application.lastName} {application.firstName}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {application.student?.studentId ||
                              application.phoneNumber ||
                              "—"}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-semibold">
                            {application.applicantType === "RETURNING_STUDENT"
                              ? l("Returning", "សិស្សចាស់")
                              : l("New", "សិស្សថ្មី")}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {application.status === "ENROLLED" &&
                          !application.targetClass ? (
                            <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                              {l(
                                "Awaiting class placement",
                                "រង់ចាំចាត់ថ្នាក់",
                              )}
                            </span>
                          ) : (
                            <p className="font-semibold text-slate-700 dark:text-gray-200">
                              {application.targetClass?.name ||
                                application.requestedGrade ||
                                l("Decide later", "សម្រេចពេលក្រោយ")}
                            </p>
                          )}
                          <p className="text-xs text-slate-500">
                            {application.academicYear?.name}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-black ${STATUS_COLORS[application.status]}`}
                          >
                            {statusLabel(application.status, km)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openApplication(application)}
                              disabled={detailLoadingId === application.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold disabled:opacity-50 dark:border-gray-700"
                            >
                              {detailLoadingId === application.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                              {l("View", "មើល")}
                            </button>
                            {actingId === application.id ? (
                              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                            ) : (
                              <>
                                {canReview &&
                                  application.applicantType === "NEW_STUDENT" &&
                                  application.status === "RECEIVED" && (
                                    <button
                                      onClick={() =>
                                        act(application, "UNDER_REVIEW")
                                      }
                                      className="rounded-lg border px-2.5 py-1.5 text-xs font-bold dark:border-gray-700"
                                    >
                                      {l("Review", "ពិនិត្យ")}
                                    </button>
                                  )}
                                {canReview &&
                                  [
                                    "RECEIVED",
                                    "UNDER_REVIEW",
                                    "WAITLISTED",
                                  ].includes(application.status) &&
                                  application.applicantType ===
                                    "NEW_STUDENT" && (
                                    <button
                                      onClick={() =>
                                        act(application, "APPROVED")
                                      }
                                      className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white"
                                    >
                                      {l("Approve", "អនុម័ត")}
                                    </button>
                                  )}
                                {canReview &&
                                  [
                                    "RECEIVED",
                                    "UNDER_REVIEW",
                                    "WAITLISTED",
                                  ].includes(application.status) &&
                                  application.applicantType ===
                                    "NEW_STUDENT" && (
                                    <button
                                      onClick={() =>
                                        act(application, "REJECTED")
                                      }
                                      className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 dark:bg-red-500/10 dark:text-red-300"
                                    >
                                      {l("Reject", "បដិសេធ")}
                                    </button>
                                  )}
                                {canReview &&
                                  application.status === "APPROVED" && (
                                    <button
                                      onClick={() =>
                                        setEnrollmentApplication(application)
                                      }
                                      className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white"
                                    >
                                      {l("Admit student", "ទទួលជាសិស្ស")}
                                    </button>
                                  )}
                                {application.applicantType ===
                                  "RETURNING_STUDENT" &&
                                  application.status === "RECEIVED" && (
                                    <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                                      {l(
                                        "Receipt recorded",
                                        "បានកត់ត្រាទទួលពាក្យ",
                                      )}
                                    </span>
                                  )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 p-4 text-sm dark:border-gray-800">
              <span className="text-slate-500">
                {l("Total", "សរុប")} {pagination.total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border p-2 disabled:opacity-30 dark:border-gray-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-bold">
                  {pagination.page} / {Math.max(1, pagination.totalPages)}
                </span>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border p-2 disabled:opacity-30 dark:border-gray-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </main>
        {showForm && (
          <AdmissionForm
            locale={locale}
            academicYearId={academicYearId}
            years={years}
            onClose={() => setShowForm(false)}
            onSaved={async () => {
              setShowForm(false);
              await load();
            }}
          />
        )}
        {enrollmentApplication && (
          <EnrollmentDecisionModal
            locale={locale}
            application={enrollmentApplication}
            submitting={actingId === enrollmentApplication.id}
            onClose={() => setEnrollmentApplication(null)}
            onConfirm={(options) => enroll(enrollmentApplication, options)}
          />
        )}
        {detailApplication && (
          <AdmissionDetailModal
            locale={locale}
            application={detailApplication}
            onClose={() => setDetailApplication(null)}
          />
        )}
      </div>
    </>
  );
}

function AdmissionDetailModal({
  locale,
  application,
  onClose,
}: {
  locale: string;
  application: AdmissionApplication;
  onClose: () => void;
}) {
  const km = locale.startsWith("km");
  const l = (en: string, kh: string) => (km ? kh : en);
  const value = (item?: string | null) => item?.trim() || "—";

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[100dvh] w-full max-w-4xl flex-col overflow-hidden border border-slate-200 bg-white shadow-xl sm:max-h-[94vh] sm:rounded-3xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-600 dark:text-blue-400">
                {application.applicationNumber}
              </p>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-black ${STATUS_COLORS[application.status]}`}
              >
                {statusLabel(application.status, km)}
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              {application.lastName} {application.firstName}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-gray-400">
              {application.applicantType === "RETURNING_STUDENT"
                ? l(
                    "Returning student · receipt record",
                    "សិស្សចាស់ · កំណត់ត្រាទទួលពាក្យ",
                  )
                : l("New student application", "ពាក្យចូលរៀនសិស្សថ្មី")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 dark:border-gray-700"
            aria-label={l("Close", "បិទ")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <ReviewCard
              label={l("Intake", "ការទទួលពាក្យ")}
              rows={[
                [
                  l("Academic year", "ឆ្នាំសិក្សា"),
                  value(application.academicYear?.name),
                ],
                [
                  l("Requested class", "ថ្នាក់ស្នើសុំ"),
                  value(
                    application.targetClass?.name || application.requestedGrade,
                  ),
                ],
              ]}
            />
            <ReviewCard
              label={l("Identity", "អត្តសញ្ញាណ")}
              rows={[
                [
                  l("Date of birth", "ថ្ងៃខែឆ្នាំកំណើត"),
                  value(application.dateOfBirth),
                ],
                [
                  l("Gender", "ភេទ"),
                  application.gender === "FEMALE"
                    ? l("Female", "ស្រី")
                    : l("Male", "ប្រុស"),
                ],
              ]}
            />
            <ReviewCard
              label={l("Contact", "ទំនាក់ទំនង")}
              rows={[
                [l("Phone", "ទូរសព្ទ"), value(application.phoneNumber)],
                [l("Email", "អ៊ីមែល"), value(application.email)],
              ]}
            />
          </div>

          {application.applicantType === "NEW_STUDENT" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <ReviewCard
                label={l("Family", "គ្រួសារ")}
                rows={[
                  [l("Father", "ឪពុក"), value(application.fatherName)],
                  [l("Mother", "ម្តាយ"), value(application.motherName)],
                  [
                    l("Guardian", "អាណាព្យាបាល"),
                    value(application.guardianName),
                  ],
                  [
                    l("Guardian phone", "ទូរសព្ទអាណាព្យាបាល"),
                    value(application.guardianPhone),
                  ],
                ]}
              />
              <ReviewCard
                label={l(
                  "Address and previous study",
                  "អាសយដ្ឋាន និងប្រវត្តិសិក្សា",
                )}
                rows={[
                  [
                    l("Place of birth", "ទីកន្លែងកំណើត"),
                    value(application.placeOfBirth),
                  ],
                  [
                    l("Current address", "អាសយដ្ឋានបច្ចុប្បន្ន"),
                    value(application.currentAddress),
                  ],
                  [
                    l("Previous school", "សាលាចាស់"),
                    value(application.previousSchool),
                  ],
                  [
                    l("Previous grade", "ថ្នាក់មុន"),
                    value(application.previousGrade),
                  ],
                ]}
              />
            </div>
          )}

          {application.notes && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                {l("Intake note", "កំណត់ត្រាទទួលពាក្យ")}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-950 dark:text-amber-100">
                {application.notes}
              </p>
            </section>
          )}

          <section>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              {l("Application history", "ប្រវត្តិពាក្យ")}
            </h3>
            <div className="mt-3 space-y-2">
              {(application.events || []).map((event) => (
                <div
                  key={event.id}
                  className="flex gap-3 rounded-xl border border-slate-200 p-3 dark:border-gray-700"
                >
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {event.toStatus
                        ? statusLabel(event.toStatus, km)
                        : event.action.replaceAll("_", " ")}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {new Date(event.createdAt).toLocaleString(
                        km ? "km-KH" : "en-GB",
                      )}
                      {event.actor
                        ? ` · ${event.actor.lastName} ${event.actor.firstName}`
                        : ""}
                    </p>
                    {event.notes && (
                      <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
                        {event.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function EnrollmentDecisionModal({
  locale,
  application,
  submitting,
  onClose,
  onConfirm,
}: {
  locale: string;
  application: AdmissionApplication;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (options: { classId?: string; leaveUnassigned?: boolean }) => void;
}) {
  const km = locale.startsWith("km");
  const l = (en: string, kh: string) => (km ? kh : en);
  const [placementMode, setPlacementMode] = useState<"UNASSIGNED" | "CLASS">(
    "UNASSIGNED",
  );
  const [classId, setClassId] = useState(application.targetClass?.id || "");
  const { classes, isLoading } = useClasses({
    academicYearId: application.academicYearId,
    limit: 100,
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.24em] text-blue-600 dark:text-blue-400">
              {l("Admission decision", "សេចក្តីសម្រេចទទួលចូលរៀន")}
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              {l(
                "Create official student record",
                "បង្កើតកំណត់ត្រាសិស្សផ្លូវការ",
              )}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
              {application.lastName} {application.firstName} ·{" "}
              {application.applicationNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
            <p className="font-black">
              {l(
                "Student admission and class placement are separate steps.",
                "ការទទួលជាសិស្ស និងការចាត់ថ្នាក់ គឺជាជំហានពីរដាច់ដោយឡែក។",
              )}
            </p>
            <p className="mt-1 leading-6 text-blue-700 dark:text-blue-300">
              {l(
                "You can create the student now and assign a class later from the Unassigned Students list.",
                "អ្នកអាចបង្កើតសិស្សឥឡូវនេះ ហើយចាត់ថ្នាក់ពេលក្រោយតាមបញ្ជីសិស្សមិនទាន់ចាត់ថ្នាក់។",
              )}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setPlacementMode("UNASSIGNED")}
              className={`rounded-2xl border p-4 text-left transition ${
                placementMode === "UNASSIGNED"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                  : "border-slate-200 hover:border-slate-300 dark:border-gray-700 dark:hover:border-gray-600"
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                <UserPlus className="h-5 w-5" />
              </span>
              <span className="mt-3 block font-black text-slate-950 dark:text-white">
                {l("Admit without a class", "ទទួលជាសិស្ស ដោយមិនទាន់ចាត់ថ្នាក់")}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-gray-400">
                {l(
                  "Recommended during application intake.",
                  "សមស្របសម្រាប់ថ្ងៃទទួលពាក្យ។",
                )}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPlacementMode("CLASS")}
              className={`rounded-2xl border p-4 text-left transition ${
                placementMode === "CLASS"
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                  : "border-slate-200 hover:border-slate-300 dark:border-gray-700 dark:hover:border-gray-600"
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <Users className="h-5 w-5" />
              </span>
              <span className="mt-3 block font-black text-slate-950 dark:text-white">
                {l(
                  "Admit and assign a class",
                  "ទទួលជាសិស្ស និងចាត់ថ្នាក់ភ្លាម",
                )}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-gray-400">
                {l(
                  "Use when the final class is already confirmed.",
                  "ប្រើនៅពេលថ្នាក់ចុងក្រោយត្រូវបានបញ្ជាក់រួច។",
                )}
              </span>
            </button>
          </div>

          {placementMode === "CLASS" && (
            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[.16em] text-slate-500 dark:text-gray-400">
                {l("Final class", "ថ្នាក់ដែលត្រូវចាត់ចូល")} *
              </span>
              <select
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                disabled={isLoading}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              >
                <option value="">
                  {l("Select a class…", "ជ្រើសរើសថ្នាក់…")}
                </option>
                {classes.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name} — {l("Grade", "ថ្នាក់ទី")}{" "}
                    {classroom.grade}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-5 dark:border-gray-800 dark:bg-gray-950/40 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            {l("Cancel", "បោះបង់")}
          </button>
          <button
            type="button"
            onClick={() =>
              onConfirm(
                placementMode === "UNASSIGNED"
                  ? { leaveUnassigned: true }
                  : { classId },
              )
            }
            disabled={submitting || (placementMode === "CLASS" && !classId)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-5 py-2.5 text-sm font-black text-white transition-colors hover:border-blue-700 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {placementMode === "UNASSIGNED"
              ? l("Admit and assign later", "ទទួលជាសិស្ស និងចាត់ថ្នាក់ពេលក្រោយ")
              : l("Admit and assign class", "ទទួលជាសិស្ស និងចាត់ថ្នាក់")}
          </button>
        </div>
      </div>
    </div>
  );
}

function statusLabel(status: AdmissionStatus, km: boolean) {
  const labels: Record<AdmissionStatus, [string, string]> = {
    DRAFT: ["Draft", "ព្រាង"],
    RECEIVED: ["Received", "បានទទួល"],
    UNDER_REVIEW: ["Under review", "កំពុងពិនិត្យ"],
    WAITLISTED: ["Waitlisted", "បញ្ជីរង់ចាំ"],
    APPROVED: ["Approved", "បានអនុម័ត"],
    REJECTED: ["Rejected", "បានបដិសេធ"],
    ENROLLED: ["Enrolled", "បានចុះឈ្មោះ"],
    WITHDRAWN: ["Withdrawn", "បានដកពាក្យ"],
  };
  return labels[status]?.[km ? 1 : 0] || status;
}

function AdmissionForm({
  locale,
  academicYearId,
  years,
  onClose,
  onSaved,
}: any) {
  const km = String(locale).startsWith("km");
  const l = (en: string, kh: string) => (km ? kh : en);
  const [step, setStep] = useState(1);
  const [type, setType] = useState<"NEW_STUDENT" | "RETURNING_STUDENT">(
    "NEW_STUDENT",
  );
  const [data, setData] = useState<AdmissionInput>({
    applicantType: "NEW_STUDENT",
    academicYearId,
    gender: "MALE",
  });
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { classes } = useClasses({
    academicYearId: data.academicYearId,
    limit: 100,
  });
  const input =
    "h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 sm:text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white";
  const set = (key: keyof AdmissionInput, value: string) =>
    setData((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (studentSearch.trim().length < 2 || type !== "RETURNING_STUDENT") {
      setStudentResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const result = await getStudents({
          search: studentSearch.trim(),
          limit: 8,
        });
        setStudentResults(result.data.students);
      } catch {
        setStudentResults([]);
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [studentSearch, type]);

  const next = () => {
    setError("");
    if (step === 1) {
      if (!data.academicYearId) {
        setError(
          l("Please select an academic year.", "សូមជ្រើសរើសឆ្នាំសិក្សា។"),
        );
        return;
      }
      if (type === "RETURNING_STUDENT" && !selectedStudent) {
        setError(
          l(
            "Please select an existing student.",
            "សូមជ្រើសរើសសិស្សដែលមានស្រាប់។",
          ),
        );
        return;
      }
      if (
        type === "NEW_STUDENT" &&
        (!data.firstName?.trim() || !data.lastName?.trim() || !data.dateOfBirth)
      ) {
        setError(
          l(
            "Name and date of birth are required.",
            "ឈ្មោះ និងថ្ងៃខែឆ្នាំកំណើត ត្រូវតែបំពេញ។",
          ),
        );
        return;
      }
    }
    if (
      step === 2 &&
      type === "NEW_STUDENT" &&
      data.email?.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
    ) {
      setError(
        l(
          "Please enter a valid email address.",
          "សូមបញ្ចូលអាសយដ្ឋានអ៊ីមែលឱ្យបានត្រឹមត្រូវ។",
        ),
      );
      return;
    }
    setStep((current) => Math.min(3, current + 1));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (step < 3) {
      next();
      return;
    }
    setLoading(true);
    setError("");
    try {
      await createAdmissionApplication({
        ...data,
        applicantType: type,
        studentId: selectedStudent?.id,
      });
      await onSaved();
    } catch (submitError: any) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = [
    l("Student", "សិស្ស"),
    l("Contact", "ទំនាក់ទំនង"),
    l("Review", "ពិនិត្យឡើងវិញ"),
  ];
  const displayName = selectedStudent
    ? `${selectedStudent.lastName} ${selectedStudent.firstName}`
    : `${data.lastName || ""} ${data.firstName || ""}`.trim();
  const yearName =
    years.find((year: any) => year.id === data.academicYearId)?.name || "—";
  const className =
    type === "RETURNING_STUDENT"
      ? l(
          "Receipt only — Year-End placement",
          "កត់ត្រាប៉ុណ្ណោះ — ចាត់ថ្នាក់តាម Year-End",
        )
      : classes.find((item: any) => item.id === data.targetClassId)?.name ||
        l("Assign later", "ចាត់ថ្នាក់ពេលក្រោយ");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 backdrop-blur-sm sm:items-center sm:p-4">
      <form
        onSubmit={submit}
        className="flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden border border-slate-200 bg-white shadow-xl sm:h-auto sm:max-h-[94vh] sm:rounded-3xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="border-b border-slate-200 bg-white px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] dark:border-gray-800 dark:bg-gray-900 sm:px-6 sm:pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.24em] text-blue-600 dark:text-blue-400">
                {l("New application", "ពាក្យចូលរៀនថ្មី")}
              </p>
              <h2 className="mt-1.5 text-xl font-black text-slate-950 dark:text-white sm:text-2xl">
                {l("Receive student application", "ទទួលពាក្យសុំចូលរៀន")}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-gray-700 dark:hover:bg-gray-800"
              aria-label={l("Close", "បិទ")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {stepTitles.map((title, index) => {
              const number = index + 1;
              return (
                <div key={title}>
                  <div
                    className={`h-1.5 rounded-full ${number <= step ? "bg-blue-600" : "bg-slate-200 dark:bg-gray-700"}`}
                  />
                  <div className="mt-2 flex items-center gap-1.5">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${number <= step ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 dark:bg-gray-800"}`}
                    >
                      {number < step ? "✓" : number}
                    </span>
                    <span
                      className={`hidden text-xs font-bold sm:inline ${number === step ? "text-blue-700 dark:text-blue-300" : "text-slate-400"}`}
                    >
                      {title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <section>
                <FormHeading
                  title={l("Applicant type", "ប្រភេទអ្នកដាក់ពាក្យ")}
                  description={l(
                    "Choose whether this student is new or already in the system.",
                    "ជ្រើសរើសសិស្សថ្មី ឬសិស្សដែលមានក្នុងប្រព័ន្ធស្រាប់។",
                  )}
                />
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-gray-800">
                  {(["NEW_STUDENT", "RETURNING_STUDENT"] as const).map(
                    (value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setType(value);
                          setSelectedStudent(null);
                          setStudentSearch("");
                          setData((prev) => ({
                            ...prev,
                            applicantType: value,
                            targetClassId:
                              value === "NEW_STUDENT"
                                ? prev.targetClassId
                                : undefined,
                          }));
                        }}
                        className={`min-h-12 rounded-xl border px-3 text-sm font-black transition-colors ${type === value ? "border-blue-200 bg-white text-blue-700 dark:border-blue-900 dark:bg-gray-950 dark:text-blue-300" : "border-transparent text-slate-500"}`}
                      >
                        {value === "NEW_STUDENT"
                          ? l("New student", "សិស្សថ្មី")
                          : l("Returning", "សិស្សចាស់")}
                      </button>
                    ),
                  )}
                </div>
              </section>
              <section>
                <FormHeading
                  title={l("Intake details", "ព័ត៌មានទទួលពាក្យ")}
                  description={l(
                    type === "NEW_STUDENT"
                      ? "Class selection is optional and can be completed later."
                      : "Returning students stay in the promotion or repetition workflow.",
                    type === "NEW_STUDENT"
                      ? "អាចទុកការចាត់ថ្នាក់សម្រាប់ធ្វើនៅពេលក្រោយ។"
                      : "សិស្សចាស់នៅតែស្ថិតក្នុងមុខងារឡើងថ្នាក់ ឬត្រួតថ្នាក់។",
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={l("Academic year", "ឆ្នាំសិក្សា")} required>
                    <select
                      className={input}
                      value={data.academicYearId}
                      onChange={(event) =>
                        setData((prev) => ({
                          ...prev,
                          academicYearId: event.target.value,
                          targetClassId: undefined,
                        }))
                      }
                    >
                      {years.map((year: any) => (
                        <option key={year.id} value={year.id}>
                          {year.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {type === "NEW_STUDENT" && (
                    <Field label={l("Requested class", "ថ្នាក់ស្នើសុំ")}>
                      <select
                        className={input}
                        value={data.targetClassId || ""}
                        onChange={(event) =>
                          set("targetClassId", event.target.value)
                        }
                      >
                        <option value="">
                          {l(
                            "Decide and assign later",
                            "សម្រេច និងចាត់ថ្នាក់ពេលក្រោយ",
                          )}
                        </option>
                        {classes.map((classroom: any) => (
                          <option key={classroom.id} value={classroom.id}>
                            {classroom.name} — {l("Grade", "ថ្នាក់ទី")}{" "}
                            {classroom.grade}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                </div>
              </section>
              {type === "RETURNING_STUDENT" ? (
                <section>
                  <FormHeading
                    title={l(
                      "Find existing student",
                      "ស្វែងរកសិស្សដែលមានស្រាប់",
                    )}
                    description={l(
                      "Search by student ID or name.",
                      "ស្វែងរកតាមលេខសម្គាល់ ឬឈ្មោះ។",
                    )}
                  />
                  <div className="relative">
                    <Search className="absolute left-3.5 top-4 h-4 w-4 text-slate-400" />
                    <input
                      className={`${input} pl-10`}
                      value={studentSearch}
                      onChange={(event) => {
                        setStudentSearch(event.target.value);
                        setSelectedStudent(null);
                      }}
                      placeholder={l(
                        "Student ID or name…",
                        "លេខសម្គាល់ ឬឈ្មោះ…",
                      )}
                    />
                  </div>
                  {selectedStudent ? (
                    <div className="mt-3 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                      <div>
                        <p className="font-black text-emerald-900 dark:text-emerald-100">
                          {displayName}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          {selectedStudent.studentId} ·{" "}
                          {selectedStudent.class?.name ||
                            l("No active class", "គ្មានថ្នាក់សកម្ម")}
                        </p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                  ) : (
                    studentResults.length > 0 && (
                      <div className="mt-2 divide-y overflow-hidden rounded-2xl border border-slate-200 dark:divide-gray-800 dark:border-gray-700">
                        {studentResults.map((student) => (
                          <button
                            type="button"
                            key={student.id}
                            onClick={() => {
                              setSelectedStudent(student);
                              setStudentSearch(
                                `${student.studentId} — ${student.lastName} ${student.firstName}`,
                              );
                              setStudentResults([]);
                            }}
                            className="flex min-h-14 w-full items-center justify-between px-4 text-left transition hover:bg-slate-50 dark:hover:bg-gray-800"
                          >
                            <span className="font-bold text-slate-900 dark:text-white">
                              {student.lastName} {student.firstName}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                              {student.studentId}
                            </span>
                          </button>
                        ))}
                      </div>
                    )
                  )}
                  <p className="mt-3 rounded-xl bg-cyan-50 p-3 text-xs font-semibold leading-5 text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-300">
                    {l(
                      "This records receipt only. Promotion or repetition remains in the Year-End workflow.",
                      "មុខងារនេះកត់ត្រាការទទួលពាក្យប៉ុណ្ណោះ។ ការឡើងថ្នាក់ ឬត្រួតថ្នាក់នៅតែធ្វើក្នុង Year-End workflow។",
                    )}
                  </p>
                </section>
              ) : (
                <section>
                  <FormHeading
                    title={l("Student identity", "អត្តសញ្ញាណសិស្ស")}
                    description={l(
                      "Enter the essential details exactly as shown on official documents.",
                      "បញ្ចូលព័ត៌មានសំខាន់ៗតាមឯកសារផ្លូវការ។",
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={l("Family name", "នាមត្រកូល")} required>
                      <input
                        className={input}
                        value={data.lastName || ""}
                        onChange={(event) =>
                          set("lastName", event.target.value)
                        }
                      />
                    </Field>
                    <Field label={l("Given name", "នាមខ្លួន")} required>
                      <input
                        className={input}
                        value={data.firstName || ""}
                        onChange={(event) =>
                          set("firstName", event.target.value)
                        }
                      />
                    </Field>
                    <Field label={l("English family name", "នាមត្រកូលឡាតាំង")}>
                      <input
                        className={input}
                        value={data.englishLastName || ""}
                        onChange={(event) =>
                          set("englishLastName", event.target.value)
                        }
                        autoCapitalize="characters"
                      />
                    </Field>
                    <Field label={l("English given name", "នាមខ្លួនឡាតាំង")}>
                      <input
                        className={input}
                        value={data.englishFirstName || ""}
                        onChange={(event) =>
                          set("englishFirstName", event.target.value)
                        }
                        autoCapitalize="characters"
                      />
                    </Field>
                    <Field label={l("Gender", "ភេទ")} required>
                      <select
                        className={input}
                        value={data.gender}
                        onChange={(event) => set("gender", event.target.value)}
                      >
                        <option value="MALE">{l("Male", "ប្រុស")}</option>
                        <option value="FEMALE">{l("Female", "ស្រី")}</option>
                      </select>
                    </Field>
                    <Field
                      label={l("Date of birth", "ថ្ងៃខែឆ្នាំកំណើត")}
                      required
                    >
                      <input
                        type="date"
                        max={new Date().toISOString().slice(0, 10)}
                        className={input}
                        value={data.dateOfBirth || ""}
                        onChange={(event) =>
                          set("dateOfBirth", event.target.value)
                        }
                      />
                    </Field>
                  </div>
                </section>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {type === "NEW_STUDENT" && (
                <section>
                  <FormHeading
                    title={l("Contact information", "ព័ត៌មានទំនាក់ទំនង")}
                    description={l(
                      "Phone details help the school contact the family quickly.",
                      "លេខទូរសព្ទជួយឱ្យសាលាទាក់ទងគ្រួសារបានលឿន។",
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={l("Student phone", "លេខទូរសព្ទសិស្ស")}>
                      <input
                        inputMode="tel"
                        className={input}
                        value={data.phoneNumber || ""}
                        onChange={(event) =>
                          set("phoneNumber", event.target.value)
                        }
                      />
                    </Field>
                    <Field label={l("Email", "អ៊ីមែល")}>
                      <input
                        type="email"
                        inputMode="email"
                        className={input}
                        value={data.email || ""}
                        onChange={(event) => set("email", event.target.value)}
                      />
                    </Field>
                    <Field label={l("Guardian name", "ឈ្មោះអាណាព្យាបាល")}>
                      <input
                        className={input}
                        value={data.guardianName || ""}
                        onChange={(event) =>
                          set("guardianName", event.target.value)
                        }
                      />
                    </Field>
                    <Field label={l("Guardian phone", "លេខទូរសព្ទអាណាព្យាបាល")}>
                      <input
                        inputMode="tel"
                        className={input}
                        value={data.guardianPhone || ""}
                        onChange={(event) =>
                          set("guardianPhone", event.target.value)
                        }
                      />
                    </Field>
                  </div>
                </section>
              )}
              {type === "NEW_STUDENT" && (
                <>
                  <section>
                    <FormHeading
                      title={l("Family and address", "គ្រួសារ និងអាសយដ្ឋាន")}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={l("Father name", "ឈ្មោះឪពុក")}>
                        <input
                          className={input}
                          value={data.fatherName || ""}
                          onChange={(event) =>
                            set("fatherName", event.target.value)
                          }
                        />
                      </Field>
                      <Field label={l("Mother name", "ឈ្មោះម្តាយ")}>
                        <input
                          className={input}
                          value={data.motherName || ""}
                          onChange={(event) =>
                            set("motherName", event.target.value)
                          }
                        />
                      </Field>
                      <Field label={l("Place of birth", "ទីកន្លែងកំណើត")}>
                        <input
                          className={input}
                          value={data.placeOfBirth || ""}
                          onChange={(event) =>
                            set("placeOfBirth", event.target.value)
                          }
                        />
                      </Field>
                      <Field
                        label={l("Current address", "អាសយដ្ឋានបច្ចុប្បន្ន")}
                      >
                        <input
                          className={input}
                          value={data.currentAddress || ""}
                          onChange={(event) =>
                            set("currentAddress", event.target.value)
                          }
                        />
                      </Field>
                    </div>
                  </section>
                  <section>
                    <FormHeading
                      title={l("Previous study", "ប្រវត្តិការសិក្សា")}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={l("Previous school", "សាលាចាស់")}>
                        <input
                          className={input}
                          value={data.previousSchool || ""}
                          onChange={(event) =>
                            set("previousSchool", event.target.value)
                          }
                        />
                      </Field>
                      <Field label={l("Previous grade", "ថ្នាក់មុន")}>
                        <input
                          className={input}
                          value={data.previousGrade || ""}
                          onChange={(event) =>
                            set("previousGrade", event.target.value)
                          }
                        />
                      </Field>
                    </div>
                  </section>
                </>
              )}
              <section>
                <Field label={l("Intake note", "កំណត់ត្រាទទួលពាក្យ")}>
                  <textarea
                    rows={4}
                    className={`${input} h-auto min-h-28 py-3`}
                    value={data.notes || ""}
                    onChange={(event) => set("notes", event.target.value)}
                    placeholder={l(
                      "Optional note for the review team…",
                      "កំណត់ត្រាបន្ថែមសម្រាប់ក្រុមពិនិត្យ…",
                    )}
                  />
                </Field>
              </section>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/60 dark:bg-blue-950/30">
                <p className="text-xs font-black uppercase tracking-[.2em] text-blue-600 dark:text-blue-400">
                  {type === "NEW_STUDENT"
                    ? l("New student", "សិស្សថ្មី")
                    : l("Returning student", "សិស្សចាស់")}
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  {displayName || l("Student application", "ពាក្យសិស្ស")}
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {yearName} · {className}
                </p>
              </div>
              {type === "RETURNING_STUDENT" ? (
                <ReviewCard
                  label={l(
                    "Existing student record",
                    "កំណត់ត្រាសិស្សដែលមានស្រាប់",
                  )}
                  rows={[
                    [
                      l("Student ID", "លេខសម្គាល់សិស្ស"),
                      selectedStudent?.studentId || "—",
                    ],
                    [
                      l("Current class", "ថ្នាក់បច្ចុប្បន្ន"),
                      selectedStudent?.class?.name || "—",
                    ],
                    [
                      l("Date of birth", "ថ្ងៃខែឆ្នាំកំណើត"),
                      selectedStudent?.dateOfBirth || "—",
                    ],
                    [
                      l("Phone", "ទូរសព្ទ"),
                      selectedStudent?.phoneNumber || "—",
                    ],
                  ]}
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <ReviewCard
                    label={l("Student details", "ព័ត៌មានសិស្ស")}
                    rows={[
                      [
                        l("Date of birth", "ថ្ងៃខែឆ្នាំកំណើត"),
                        data.dateOfBirth || "—",
                      ],
                      [
                        l("Gender", "ភេទ"),
                        data.gender === "FEMALE"
                          ? l("Female", "ស្រី")
                          : l("Male", "ប្រុស"),
                      ],
                      [l("Phone", "ទូរសព្ទ"), data.phoneNumber || "—"],
                    ]}
                  />
                  <ReviewCard
                    label={l("Family contact", "ទំនាក់ទំនងគ្រួសារ")}
                    rows={[
                      [l("Guardian", "អាណាព្យាបាល"), data.guardianName || "—"],
                      [
                        l("Guardian phone", "ទូរសព្ទអាណាព្យាបាល"),
                        data.guardianPhone || "—",
                      ],
                      [
                        l("Previous school", "សាលាចាស់"),
                        data.previousSchool || "—",
                      ],
                    ]}
                  />
                </div>
              )}
              {data.notes && (
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-gray-700">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                    {l("Intake note", "កំណត់ត្រាទទួលពាក្យ")}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-gray-200">
                    {data.notes}
                  </p>
                </div>
              )}
              <p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                {type === "RETURNING_STUDENT"
                  ? l(
                      "Saving records receipt only; it will not change the student's class or progression.",
                      "ការរក្សាទុកគឺកត់ត្រាការទទួលពាក្យប៉ុណ្ណោះ មិនផ្លាស់ប្តូរថ្នាក់ ឬការឡើងថ្នាក់របស់សិស្សទេ។",
                    )
                  : l(
                      "Please verify the information before saving. The application can be reviewed and approved afterward.",
                      "សូមផ្ទៀងផ្ទាត់ព័ត៌មានមុនរក្សាទុក។ ពាក្យនេះអាចត្រូវបានពិនិត្យ និងអនុម័តនៅពេលក្រោយ។",
                    )}
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 dark:border-gray-800 dark:bg-gray-900 sm:justify-between sm:px-6 sm:pb-5">
          <button
            type="button"
            onClick={() =>
              step === 1 ? onClose() : setStep((current) => current - 1)
            }
            disabled={loading}
            className="min-h-12 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"
          >
            {step === 1 ? l("Cancel", "បោះបង់") : l("Back", "ត្រឡប់ក្រោយ")}
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs font-bold text-slate-400 sm:block">
              {l("Step", "ជំហាន")} {step}/3
            </span>
            {step < 3 ? (
              <button
                type="button"
                onClick={next}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-5 text-sm font-black text-white transition-colors hover:border-blue-700 hover:bg-blue-700"
              >
                {l("Continue", "បន្ត")}
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-5 text-sm font-black text-white transition-colors hover:border-blue-700 hover:bg-blue-700 disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {l("Save application", "រក្សាទុកពាក្យ")}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function FormHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-black text-slate-900 dark:text-white">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-gray-400">
          {description}
        </p>
      )}
    </div>
  );
}

function ReviewCard({
  label,
  rows,
}: {
  label: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-gray-700">
      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <dl className="mt-3 space-y-2.5">
        {rows.map(([key, value]) => (
          <div
            key={key}
            className="flex items-start justify-between gap-4 text-sm"
          >
            <dt className="text-slate-500">{key}</dt>
            <dd className="text-right font-bold text-slate-900 dark:text-white">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-gray-300">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
