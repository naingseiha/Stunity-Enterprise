import type { PrismaClient } from "@prisma/client";
import { resolveReportAcademicStartYear } from "../report-utils";
import * as L from "./khm-moeys-logic";
import {
  monthsClosedByCalendarEvents,
  resolveSemesterMonthPlan,
} from "./resolve-semester-months";

export type MonthlyReportFormat =
  | "summary"
  | "detailed"
  | "semester-1"
  | "semester-2"
  | "semester-exam-1"
  | "semester-exam-2"
  | "annual"
  | "tracking-1"
  | "tracking-2";

export interface MonthlyReportQuery {
  scope?: string;
  classId?: string;
  grade?: string;
  month?: string;
  monthNumber?: string;
  year?: string;
  periodYear?: string;
  academicYearId?: string;
  format?: string;
  months?: string;
  /** Override school education model (e.g. template=KHM_MOEYS for CUSTOM schools) */
  template?: string;
}

function parseFormat(raw?: string): MonthlyReportFormat {
  const f = String(raw || "summary").toLowerCase().replace(/_/g, "-");
  if (f === "detailed") return "detailed";
  if (f === "semester-1" || f === "semester1") return "semester-1";
  if (f === "semester-2" || f === "semester2") return "semester-2";
  if (
    f === "semester-exam-1" ||
    f === "semesterexam-1" ||
    f === "semester-exam1" ||
    f === "exam-1" ||
    f === "exam1"
  ) {
    return "semester-exam-1";
  }
  if (
    f === "semester-exam-2" ||
    f === "semesterexam-2" ||
    f === "semester-exam2" ||
    f === "exam-2" ||
    f === "exam2"
  ) {
    return "semester-exam-2";
  }
  if (f === "annual" || f === "year" || f === "yearly") return "annual";
  if (f === "tracking-1" || f === "tracking1") return "tracking-1";
  if (f === "tracking-2" || f === "tracking2") return "tracking-2";
  return "summary";
}

function isSemesterBundleFormat(format: MonthlyReportFormat) {
  return (
    format === "semester-1" ||
    format === "semester-2" ||
    format === "semester-exam-1" ||
    format === "semester-exam-2" ||
    format === "tracking-1" ||
    format === "tracking-2"
  );
}

function semesterTermNumber(format: MonthlyReportFormat): 1 | 2 {
  return format.endsWith("2") ? 2 : 1;
}

/** Resolve month number from query (duplicated from index — Khmer labels use explicit monthNumber) */
function resolveMonthNumber(
  month: string,
  providedMonthNumber?: number,
): number {
  if (
    typeof providedMonthNumber === "number" &&
    Number.isFinite(providedMonthNumber)
  ) {
    return providedMonthNumber;
  }
  const parsed = parseInt(month.replace(/[^\d]/g, ""), 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 1;
}

type RankedStudent = {
  studentId: string;
  studentCode?: string | null;
  studentName: string;
  firstName: string;
  lastName: string;
  gender: string;
  classId?: string | null;
  className?: string | null;
  classTrack?: string | null;
  grades: Record<string, number | null>;
  totalScore: number;
  totalCoefficient: number;
  average: number;
  gradeLevel: string;
  rank: number;
  absent: number;
  permission: number;
};

type SemesterOneExtras = {
  preSemesterAverage: number;
  preSemesterRank: number;
  examTotal: number;
  examAverage: number;
  examRank: number;
  finalAverage: number;
  finalRank: number;
  finalGrade: string;
  /** Per-month averages in the semester (pre-exam months + exam month). */
  monthAverages?: Record<number, number>;
};

type AnnualExtras = {
  semester1Average: number;
  semester1Rank: number;
  semester2Average: number;
  semester2Rank: number;
  annualAverage: number;
  annualRank: number;
  annualGrade: string;
};

async function computeRankedStudentsForMonth(
  prisma: PrismaClient,
  ctx: {
    schoolId: string;
    reportScope: "class" | "grade";
    selectedClasses: any[];
    classIds: string[];
    roster: Array<{ student: any; class: any }>;
    classById: Map<string, any>;
    reportGrade: string;
    sortedSubjects: any[];
    subjectAliasMap: Map<string, string[]>;
    subjectById: Map<string, any>;
    requestedMonthNumber: number;
    monthLabel: string;
    actualYear: number;
  },
): Promise<RankedStudent[]> {
  const {
    schoolId,
    reportScope,
    selectedClasses,
    classIds,
    roster,
    classById,
    reportGrade,
    sortedSubjects,
    subjectAliasMap,
    subjectById,
    requestedMonthNumber,
    monthLabel,
    actualYear,
  } = ctx;

  const studentIds = roster.map((entry) => entry.student.id);

  const [gradesForMonth, attendanceCounts] = await Promise.all([
    studentIds.length > 0
      ? prisma.grade.findMany({
          where: {
            studentId: { in: studentIds },
            classId: { in: classIds },
            ...L.buildMonthlyGradeWhere(
              requestedMonthNumber,
              monthLabel,
              actualYear,
            ),
          },
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                nameKh: true,
                nameEn: true,
                nameKhShort: true,
                nameEnShort: true,
                code: true,
                maxScore: true,
                coefficient: true,
                track: true,
                category: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    studentIds.length > 0
      ? prisma.attendance.groupBy({
          by: ["studentId", "status"],
          where: {
            studentId: { in: studentIds },
            classId: { in: classIds },
            date: {
              gte: L.monthStart(actualYear, requestedMonthNumber),
              lte: L.monthEnd(actualYear, requestedMonthNumber),
            },
          },
          _count: {
            status: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const gradesByStudent = new Map<string, Map<string, any>>();
  gradesForMonth.forEach((gradeEntry) => {
    const studentGrades =
      gradesByStudent.get(gradeEntry.studentId) || new Map();
    studentGrades.set(gradeEntry.subjectId, gradeEntry);
    gradesByStudent.set(gradeEntry.studentId, studentGrades);
  });

  const attendanceByStudent = new Map<
    string,
    { absent: number; permission: number }
  >();
  attendanceCounts.forEach((entry) => {
    const totals = attendanceByStudent.get(entry.studentId) || {
      absent: 0,
      permission: 0,
    };
    if (entry.status === "ABSENT") totals.absent += entry._count.status;
    if (entry.status === "PERMISSION" || entry.status === "EXCUSED")
      totals.permission += entry._count.status;
    attendanceByStudent.set(entry.studentId, totals);
  });

  const usesSemesterOneEnglishRule = L.shouldApplySemesterOneEnglishRule(
    reportGrade,
    requestedMonthNumber,
    monthLabel,
  );

  const reportStudents = roster.map((entry) => {
    const classInfo = entry.class || classById.get(entry.student.classId || "");
    const classTrack = classInfo?.track || null;
    const studentGrades = gradesByStudent.get(entry.student.id) || new Map();
    const gradeMap: Record<string, number | null> = {};
    let totalScore = 0;
    let totalCoefficient = 0;
    let englishBonus = 0;

    sortedSubjects.forEach((subject) => {
      const subjectIds = subjectAliasMap.get(subject.id) || [subject.id];
      const appliesToTrack = subjectIds.some((subjectId) => {
        const subjectTrack = subjectById.get(subjectId)?.track || null;
        return (
          !subjectTrack ||
          subjectTrack === "common" ||
          subjectTrack === classTrack
        );
      });
      if (!appliesToTrack) return;

      const gradeEntry = subjectIds
        .map((subjectId) => studentGrades.get(subjectId))
        .find(Boolean);
      gradeMap[subject.id] = gradeEntry ? gradeEntry.score : null;
      if (!gradeEntry) return;

      if (usesSemesterOneEnglishRule && L.isEnglishSubject(subject)) {
        englishBonus += Math.max(
          gradeEntry.score - L.ENGLISH_SCORE_BASELINE,
          0,
        );
        return;
      }

      totalScore += gradeEntry.score;
      totalCoefficient += subject.coefficient || 0;
    });

    const adjustedTotalScore = totalScore + englishBonus;
    const average =
      totalCoefficient > 0 ? adjustedTotalScore / totalCoefficient : 0;
    const attendance = attendanceByStudent.get(entry.student.id) || {
      absent: 0,
      permission: 0,
    };

    return {
      studentId: entry.student.id,
      studentCode: entry.student.studentId,
      studentName: L.getKhmerStudentName(entry.student),
      firstName: entry.student.firstName,
      lastName: entry.student.lastName,
      gender: entry.student.gender,
      classId: classInfo?.id || entry.student.classId,
      className: classInfo?.name || "",
      classTrack,
      grades: gradeMap,
      totalScore: Math.round(adjustedTotalScore * 100) / 100,
      totalCoefficient: Math.round(totalCoefficient * 100) / 100,
      average: Math.round(average * 100) / 100,
      gradeLevel: L.khmerMonthlyGradeLevel(average),
      rank: 0,
      absent: attendance.absent,
      permission: attendance.permission,
    };
  });

  return reportStudents
    .sort((a, b) => {
      if (b.average !== a.average) return b.average - a.average;
      return a.studentName.localeCompare(b.studentName, "km");
    })
    .map((student, index) => ({
      ...student,
      rank: index + 1,
    }));
}

async function loadSharedContext(
  prisma: PrismaClient,
  schoolId: string,
  query: MonthlyReportQuery,
) {
  const {
    scope = "class",
    classId,
    grade,
    month,
    monthNumber,
    year,
    periodYear,
    academicYearId,
  } = query;

  const requestedMonthNumber =
    Number(monthNumber) || resolveMonthNumber(String(month || ""), undefined);
  if (
    !requestedMonthNumber ||
    requestedMonthNumber < 1 ||
    requestedMonthNumber > 12
  ) {
    throw new Error(
      "VALIDATION: A valid monthNumber between 1 and 12 is required",
    );
  }

  const academicStartYear = await resolveReportAcademicStartYear(
    prisma,
    schoolId,
    year as string | undefined,
  );

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      address: true,
      countryCode: true,
      defaultLanguage: true,
      educationModel: true,
    },
  });

  const reportScope: "class" | "grade" =
    String(scope) === "grade" ? "grade" : "class";
  const selectedClasses =
    reportScope === "class"
      ? await prisma.class.findMany({
          where: {
            id: String(classId || ""),
            schoolId,
            ...(academicYearId
              ? { academicYearId: String(academicYearId) }
              : {}),
          },
          include: {
            academicYear: true,
            homeroomTeacher: true,
          },
        })
      : await prisma.class.findMany({
          where: {
            schoolId,
            grade: String(grade || ""),
            ...(academicYearId
              ? { academicYearId: String(academicYearId) }
              : {}),
          },
          include: {
            academicYear: true,
            homeroomTeacher: true,
          },
          orderBy: [{ name: "asc" }, { section: "asc" }],
        });

  if (selectedClasses.length === 0) {
    throw new Error(
      reportScope === "class"
        ? "NOT_FOUND: Class not found"
        : "NOT_FOUND: No classes found for this grade",
    );
  }

  const classIds = selectedClasses.map((classInfo) => classInfo.id);
  const reportGrade =
    reportScope === "class"
      ? selectedClasses[0].grade
      : String(grade || selectedClasses[0].grade);
  const classById = new Map(
    selectedClasses.map((classInfo) => [classInfo.id, classInfo]),
  );
  const bootstrapMonthNumber = requestedMonthNumber;
  const bootstrapLabel = L.resolveKhmerMonthLabel(
    bootstrapMonthNumber,
    month as string | undefined,
  );
  const bootstrapActualYear = L.resolveKhmerMonthlyReportPeriod(
    academicStartYear,
    bootstrapMonthNumber,
    periodYear as string | undefined,
  );
  const reportPeriodStart = L.monthStart(
    bootstrapActualYear,
    bootstrapMonthNumber,
  );
  const reportPeriodEnd = L.monthEnd(bootstrapActualYear, bootstrapMonthNumber);

  const studentClasses = await prisma.studentClass.findMany({
    where: {
      classId: { in: classIds },
      startedAt: { lte: reportPeriodEnd },
      OR: [{ endedAt: null }, { endedAt: { gt: reportPeriodStart } }],
      ...(academicYearId ? { academicYearId: String(academicYearId) } : {}),
    },
    include: {
      student: true,
      class: true,
    },
    orderBy: [{ class: { name: "asc" } }, { student: { firstName: "asc" } }],
  });

  const fallbackStudents =
    studentClasses.length > 0
      ? []
      : await prisma.student.findMany({
          where: {
            schoolId,
            classId: { in: classIds },
            recordStatus: "ACTIVE",
          },
          include: {
            class: true,
          },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        });

  const roster =
    studentClasses.length > 0
      ? studentClasses.map((studentClass) => ({
          student: studentClass.student,
          class: studentClass.class,
        }))
      : fallbackStudents.map((student) => ({
          student,
          class: student.class || classById.get(student.classId || ""),
        }));

  const trackValues = Array.from(
    new Set(
      selectedClasses.map((classInfo) => classInfo.track).filter(Boolean),
    ),
  ) as string[];
  const subjects = await prisma.subject.findMany({
    where: {
      grade: reportGrade,
      isActive: true,
      OR: [
        { track: null },
        { track: "common" },
        ...trackValues.map((track) => ({ track })),
      ],
    },
    select: {
      id: true,
      name: true,
      nameKh: true,
      nameEn: true,
      nameKhShort: true,
      nameEnShort: true,
      code: true,
      maxScore: true,
      coefficient: true,
      track: true,
      category: true,
    },
  });
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));

  const studentIds = roster.map((entry) => entry.student.id);

  const bootstrapGrades =
    studentIds.length > 0
      ? await prisma.grade.findMany({
          where: {
            studentId: { in: studentIds },
            classId: { in: classIds },
            ...L.buildMonthlyGradeWhere(
              bootstrapMonthNumber,
              bootstrapLabel,
              bootstrapActualYear,
            ),
          },
          select: { subjectId: true },
        })
      : [];

  const gradeCountBySubject = new Map<string, number>();
  bootstrapGrades.forEach((gradeEntry) => {
    gradeCountBySubject.set(
      gradeEntry.subjectId,
      (gradeCountBySubject.get(gradeEntry.subjectId) || 0) + 1,
    );
  });

  const subjectsByGroup = new Map<string, typeof subjects>();
  subjects.forEach((subject) => {
    const groupKey = L.getKhmerMonthlySubjectGroupKey(subject);
    const groupedSubjects = subjectsByGroup.get(groupKey) || [];
    groupedSubjects.push(subject);
    subjectsByGroup.set(groupKey, groupedSubjects);
  });

  const subjectAliasMap = new Map<string, string[]>();
  const sortedSubjects = Array.from(subjectsByGroup.values())
    .map((groupedSubjects) => {
      const preferredSubject = [...groupedSubjects].sort((a, b) => {
        const bGradeCount = gradeCountBySubject.get(b.id) || 0;
        const aGradeCount = gradeCountBySubject.get(a.id) || 0;
        if (bGradeCount !== aGradeCount) return bGradeCount - aGradeCount;

        const aTrack = L.normalizeKhmerReportKey(a.track);
        const bTrack = L.normalizeKhmerReportKey(b.track);
        const aTrackPriority =
          aTrack && aTrack !== "common" ? 0 : aTrack === "common" ? 1 : 2;
        const bTrackPriority =
          bTrack && bTrack !== "common" ? 0 : bTrack === "common" ? 1 : 2;
        if (aTrackPriority !== bTrackPriority)
          return aTrackPriority - bTrackPriority;

        return L.compareSubjectsForKhmerMonthlyReport(a, b);
      })[0];

      subjectAliasMap.set(
        preferredSubject.id,
        groupedSubjects.map((subject) => subject.id),
      );
      return preferredSubject;
    })
    .sort(L.compareSubjectsForKhmerMonthlyReport);

  const homeroomTeacher =
    reportScope === "class" ? selectedClasses[0].homeroomTeacher : null;
  const teacherName = homeroomTeacher
    ? `${homeroomTeacher.lastName || ""} ${homeroomTeacher.firstName || ""}`.trim()
    : "";

  return {
    requestedMonthNumber,
    academicStartYear,
    school,
    reportScope,
    selectedClasses,
    classIds,
    roster,
    classById,
    reportGrade,
    sortedSubjects,
    subjectAliasMap,
    subjectById,
    homeroomTeacher,
    teacherName,
    monthParam: month as string | undefined,
    periodYear,
    academicYearId,
  };
}

export async function buildKhmMoeysMonthlyReport(
  prisma: PrismaClient,
  schoolId: string,
  query: MonthlyReportQuery,
) {
  const format = parseFormat(query.format);

  if (format === "annual") {
    const [semesterOne, semesterTwo] = await Promise.all([
      buildKhmMoeysMonthlyReport(prisma, schoolId, {
        ...query,
        format: "semester-1",
      }),
      buildKhmMoeysMonthlyReport(prisma, schoolId, {
        ...query,
        format: "semester-2",
      }),
    ]);

    const semesterTwoByStudent = new Map(
      (semesterTwo.students as Array<RankedStudent & { semesterOne?: SemesterOneExtras }>).map(
        (student) => [student.studentId, student],
      ),
    );

    const merged = (
      semesterOne.students as Array<
        RankedStudent & { semesterOne?: SemesterOneExtras }
      >
    )
      .map((sem1Row) => {
        const sem2Row = semesterTwoByStudent.get(sem1Row.studentId);
        if (!sem2Row?.semesterOne || !sem1Row.semesterOne) return null;

        const semester1Average = sem1Row.semesterOne.finalAverage;
        const semester2Average = sem2Row.semesterOne.finalAverage;
        const annualAverage =
          Math.round(((semester1Average + semester2Average) / 2) * 100) / 100;

        const annual: AnnualExtras = {
          semester1Average,
          semester1Rank: sem1Row.semesterOne.finalRank,
          semester2Average,
          semester2Rank: sem2Row.semesterOne.finalRank,
          annualAverage,
          annualRank: 0,
          annualGrade: L.khmerMonthlyGradeLevel(annualAverage),
        };

        return {
          ...sem1Row,
          average: annualAverage,
          gradeLevel: annual.annualGrade,
          rank: 0,
          absent: (sem1Row.absent || 0) + (sem2Row.absent || 0),
          permission: (sem1Row.permission || 0) + (sem2Row.permission || 0),
          annual,
          semesterOne: sem1Row.semesterOne,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const annualSorted = [...merged].sort(
      (a, b) => b.annual.annualAverage - a.annual.annualAverage,
    );
    const rankedStudents = annualSorted.map((row, index) => ({
      ...row,
      rank: index + 1,
      annual: { ...row.annual, annualRank: index + 1 },
      average: row.annual.annualAverage,
      gradeLevel: row.annual.annualGrade,
    }));

    const totalStudents = rankedStudents.length;
    const femaleStudents = rankedStudents.filter((student) =>
      L.isFemaleGender(student.gender),
    ).length;
    const passedStudents = rankedStudents.filter(
      (student) => student.average >= L.KHMER_MONTH_PASSING_AVERAGE,
    );
    const failedStudents = rankedStudents.filter(
      (student) => student.average < L.KHMER_MONTH_PASSING_AVERAGE,
    );

    const monthsIncluded = [
      ...(semesterOne.monthsIncluded || []),
      ...(semesterTwo.monthsIncluded || []),
    ];

    return {
      template: L.KHMER_MONTH_REPORT_TEMPLATE,
      format,
      scope: semesterOne.scope,
      school: semesterOne.school,
      academicYear: semesterOne.academicYear,
      period: {
        month: "ប្រចាំឆ្នាំ",
        monthNumber: 0,
        academicStartYear: semesterOne.period.academicStartYear,
        year: semesterOne.period.year,
      },
      monthsIncluded,
      class: semesterOne.class,
      grade: semesterOne.grade,
      classNames: semesterOne.classNames,
      totalClasses: semesterOne.totalClasses,
      teacherName: semesterOne.teacherName,
      subjects: semesterOne.subjects,
      students: rankedStudents,
      statistics: {
        totalStudents,
        femaleStudents,
        passedStudents: passedStudents.length,
        passedFemaleStudents: passedStudents.filter((student) =>
          L.isFemaleGender(student.gender),
        ).length,
        failedStudents: failedStudents.length,
        failedFemaleStudents: failedStudents.filter((student) =>
          L.isFemaleGender(student.gender),
        ).length,
      },
      rules: semesterOne.rules,
      generatedAt: new Date().toISOString(),
    };
  }

  const shared = await loadSharedContext(prisma, schoolId, query);

  if (isSemesterBundleFormat(format)) {
    const termNumber = semesterTermNumber(format);
    const isExamOnly =
      format === "semester-exam-1" || format === "semester-exam-2";
    const isTracking = format === "tracking-1" || format === "tracking-2";

    // Resolve pre-exam months + exam month from AcademicTerm + Academic Calendar breaks.
    let termForPlan: {
      startDate: Date;
      endDate: Date;
      examMonth: number | null;
      excludedMonths: number[];
    } | null = null;
    let calendarBreakMonths: number[] = [];

    if (query.academicYearId) {
      const [terms, calendarEvents] = await Promise.all([
        prisma.academicTerm.findMany({
          where: {
            academicYearId: query.academicYearId,
            termNumber,
          },
        }),
        prisma.calendarEvent.findMany({
          where: {
            calendar: { academicYearId: query.academicYearId },
            OR: [
              { type: { in: ["VACATION", "HOLIDAY"] } },
              { isSchoolDay: false },
            ],
          },
          select: {
            type: true,
            isSchoolDay: true,
            startDate: true,
            endDate: true,
          },
        }),
      ]);

      const gradeNum =
        Number(String(shared.reportGrade).replace(/[^0-9]/g, "")) || 0;
      const term =
        terms.find(
          (t) => t.gradeLevels.length === 0 || t.gradeLevels.includes(gradeNum),
        ) || terms[0];

      if (term) {
        termForPlan = {
          startDate: term.startDate,
          endDate: term.endDate,
          examMonth: term.examMonth,
          excludedMonths: term.excludedMonths || [],
        };
      }
      calendarBreakMonths = monthsClosedByCalendarEvents(calendarEvents);
    }

    const monthPlan = resolveSemesterMonthPlan(termNumber, termForPlan, {
      fallbackExamMonth: shared.requestedMonthNumber,
      calendarBreakMonths,
    });
    const preMonths = monthPlan.preMonths;
    const examMonthNumber = monthPlan.examMonth;

    const examLabel = L.resolveKhmerMonthLabel(
      examMonthNumber,
      shared.monthParam,
    );
    const examActualYear = L.resolveKhmerMonthlyReportPeriod(
      shared.academicStartYear,
      examMonthNumber,
      query.periodYear as string | undefined,
    );

    const preSnapshots: {
      monthNumber: number;
      label: string;
      year: number;
      students: RankedStudent[];
    }[] = [];

    // Exam-only reports skip pre-month aggregation for speed; tracking/semester need them.
    if (!isExamOnly) {
      for (const m of preMonths) {
        const label = L.resolveKhmerMonthLabel(m, undefined);
        const actualYear = L.resolveKhmerMonthlyReportPeriod(
          shared.academicStartYear,
          m,
          query.periodYear as string | undefined,
        );
        const students = await computeRankedStudentsForMonth(prisma, {
          schoolId,
          reportScope: shared.reportScope,
          selectedClasses: shared.selectedClasses,
          classIds: shared.classIds,
          roster: shared.roster,
          classById: shared.classById,
          reportGrade: shared.reportGrade,
          sortedSubjects: shared.sortedSubjects,
          subjectAliasMap: shared.subjectAliasMap,
          subjectById: shared.subjectById,
          requestedMonthNumber: m,
          monthLabel: label,
          actualYear,
        });
        preSnapshots.push({ monthNumber: m, label, year: actualYear, students });
      }
    }

    const examStudents = await computeRankedStudentsForMonth(prisma, {
      schoolId,
      reportScope: shared.reportScope,
      selectedClasses: shared.selectedClasses,
      classIds: shared.classIds,
      roster: shared.roster,
      classById: shared.classById,
      reportGrade: shared.reportGrade,
      sortedSubjects: shared.sortedSubjects,
      subjectAliasMap: shared.subjectAliasMap,
      subjectById: shared.subjectById,
      requestedMonthNumber: examMonthNumber,
      monthLabel: examLabel,
      actualYear: examActualYear,
    });

    const merged = examStudents.map((examRow) => {
      const monthAverages: Record<number, number> = {};
      const preMonthAverages: number[] = [];
      for (const snap of preSnapshots) {
        const row = snap.students.find(
          (s) => s.studentId === examRow.studentId,
        );
        if (row !== undefined) {
          preMonthAverages.push(row.average);
          monthAverages[snap.monthNumber] = row.average;
        }
      }
      monthAverages[examMonthNumber] = examRow.average;

      const preSemesterAverage =
        preMonthAverages.length > 0
          ? preMonthAverages.reduce((sum, v) => sum + v, 0) /
            preMonthAverages.length
          : 0;

      const examAverage = examRow.average;
      const examTotal = examRow.totalScore;
      const finalAverage = isExamOnly
        ? examAverage
        : (preSemesterAverage + examAverage) / 2;

      const semesterOne: SemesterOneExtras = {
        preSemesterAverage,
        preSemesterRank: 0,
        examTotal,
        examAverage,
        examRank: 0,
        finalAverage,
        finalRank: 0,
        finalGrade: L.khmerMonthlyGradeLevel(finalAverage),
        monthAverages,
      };

      return {
        ...examRow,
        average: finalAverage,
        totalScore: examTotal,
        gradeLevel: semesterOne.finalGrade,
        rank: 0,
        semesterOne,
      };
    });

    const preSorted = [...merged].sort(
      (a, b) =>
        b.semesterOne.preSemesterAverage - a.semesterOne.preSemesterAverage,
    );
    const examSorted = [...merged].sort(
      (a, b) => b.semesterOne.examAverage - a.semesterOne.examAverage,
    );
    const finalSorted = [...merged].sort(
      (a, b) => b.semesterOne.finalAverage - a.semesterOne.finalAverage,
    );

    const withRanks = merged.map((row) => ({
      ...row,
      semesterOne: {
        ...row.semesterOne,
        preSemesterRank:
          preSorted.findIndex((s) => s.studentId === row.studentId) + 1,
        examRank:
          examSorted.findIndex((s) => s.studentId === row.studentId) + 1,
        finalRank:
          finalSorted.findIndex((s) => s.studentId === row.studentId) + 1,
      },
    }));

    const sortKey = isExamOnly
      ? (row: (typeof withRanks)[number]) => row.semesterOne.examAverage
      : (row: (typeof withRanks)[number]) => row.semesterOne.finalAverage;

    const rankedStudents = withRanks
      .sort((a, b) => {
        const diff = sortKey(b) - sortKey(a);
        if (diff !== 0) return diff;
        return a.studentName.localeCompare(b.studentName, "km");
      })
      .map((s, i) => ({
        ...s,
        rank: i + 1,
        gradeLevel: isExamOnly
          ? L.khmerMonthlyGradeLevel(s.semesterOne.examAverage)
          : s.semesterOne.finalGrade,
        average: isExamOnly
          ? s.semesterOne.examAverage
          : s.semesterOne.finalAverage,
      }));

    const totalStudents = rankedStudents.length;
    const femaleStudents = rankedStudents.filter((student) =>
      L.isFemaleGender(student.gender),
    ).length;
    const passedStudents = rankedStudents.filter(
      (student) => student.average >= L.KHMER_MONTH_PASSING_AVERAGE,
    );
    const failedStudents = rankedStudents.filter(
      (student) => student.average < L.KHMER_MONTH_PASSING_AVERAGE,
    );

    const monthsIncluded = isExamOnly
      ? [
          {
            monthNumber: examMonthNumber,
            label: examLabel,
            year: examActualYear,
          },
        ]
      : [
          ...preSnapshots.map((s) => ({
            monthNumber: s.monthNumber,
            label: s.label,
            year: s.year,
          })),
          {
            monthNumber: examMonthNumber,
            label: examLabel,
            year: examActualYear,
          },
        ];

    // Normalize response format tags for print dispatch:
    // tracking keeps tracking-* ; exam-only keeps semester-exam-* ; else semester-*.
    const responseFormat: MonthlyReportFormat = isTracking
      ? format
      : isExamOnly
        ? format
        : termNumber === 1
          ? "semester-1"
          : "semester-2";

    return {
      template: L.KHMER_MONTH_REPORT_TEMPLATE,
      format: responseFormat,
      scope: shared.reportScope as "class" | "grade",
      school: shared.school,
      academicYear: {
        startYear: shared.academicStartYear,
        label: `${shared.academicStartYear}-${shared.academicStartYear + 1}`,
        id: shared.selectedClasses[0].academicYearId,
      },
      period: {
        month: examLabel,
        monthNumber: examMonthNumber,
        academicStartYear: shared.academicStartYear,
        year: examActualYear,
      },
      monthsIncluded,
      class:
        shared.reportScope === "class"
          ? {
              id: shared.selectedClasses[0].id,
              name: shared.selectedClasses[0].name,
              grade: shared.selectedClasses[0].grade,
              track: shared.selectedClasses[0].track,
            }
          : null,
      grade: shared.reportGrade,
      classNames: shared.selectedClasses.map((classInfo) => classInfo.name),
      totalClasses: shared.selectedClasses.length,
      teacherName: shared.teacherName,
      subjects: shared.sortedSubjects,
      students: rankedStudents,
      statistics: {
        totalStudents,
        femaleStudents,
        passedStudents: passedStudents.length,
        passedFemaleStudents: passedStudents.filter((student) =>
          L.isFemaleGender(student.gender),
        ).length,
        failedStudents: failedStudents.length,
        failedFemaleStudents: failedStudents.filter((student) =>
          L.isFemaleGender(student.gender),
        ).length,
      },
      rules: {
        system: "KHM_MOEYS",
        passingAverage: L.KHMER_MONTH_PASSING_AVERAGE,
        semesterOneEnglishBaseline: L.ENGLISH_SCORE_BASELINE,
        usesSemesterOneEnglishRule: L.shouldApplySemesterOneEnglishRule(
          shared.reportGrade,
          examMonthNumber,
          examLabel,
        ),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /** summary & detailed — same payload; print layout differs on client */
  const requestedMonthNumber = shared.requestedMonthNumber;
  const monthLabel = L.resolveKhmerMonthLabel(
    requestedMonthNumber,
    shared.monthParam,
  );
  const actualYear = L.resolveKhmerMonthlyReportPeriod(
    shared.academicStartYear,
    requestedMonthNumber,
    query.periodYear as string | undefined,
  );

  const rankedStudents = await computeRankedStudentsForMonth(prisma, {
    schoolId,
    reportScope: shared.reportScope as "class" | "grade",
    selectedClasses: shared.selectedClasses,
    classIds: shared.classIds,
    roster: shared.roster,
    classById: shared.classById,
    reportGrade: shared.reportGrade,
    sortedSubjects: shared.sortedSubjects,
    subjectAliasMap: shared.subjectAliasMap,
    subjectById: shared.subjectById,
    requestedMonthNumber,
    monthLabel,
    actualYear,
  });

  const totalStudents = rankedStudents.length;
  const femaleStudents = rankedStudents.filter((student) =>
    L.isFemaleGender(student.gender),
  ).length;
  const passedStudents = rankedStudents.filter(
    (student) => student.average >= L.KHMER_MONTH_PASSING_AVERAGE,
  );
  const failedStudents = rankedStudents.filter(
    (student) => student.average < L.KHMER_MONTH_PASSING_AVERAGE,
  );

  const usesSemesterOneEnglishRule = L.shouldApplySemesterOneEnglishRule(
    shared.reportGrade,
    requestedMonthNumber,
    monthLabel,
  );

  return {
    template: L.KHMER_MONTH_REPORT_TEMPLATE,
    format,
    scope: shared.reportScope as "class" | "grade",
    school: shared.school,
    academicYear: {
      startYear: shared.academicStartYear,
      label: `${shared.academicStartYear}-${shared.academicStartYear + 1}`,
      id: shared.selectedClasses[0].academicYearId,
    },
    period: {
      month: monthLabel,
      monthNumber: requestedMonthNumber,
      academicStartYear: shared.academicStartYear,
      year: actualYear,
    },
    monthsIncluded: [
      {
        monthNumber: requestedMonthNumber,
        label: monthLabel,
        year: actualYear,
      },
    ],
    class:
      shared.reportScope === "class"
        ? {
            id: shared.selectedClasses[0].id,
            name: shared.selectedClasses[0].name,
            grade: shared.selectedClasses[0].grade,
            track: shared.selectedClasses[0].track,
          }
        : null,
    grade: shared.reportGrade,
    classNames: shared.selectedClasses.map((classInfo) => classInfo.name),
    totalClasses: shared.selectedClasses.length,
    teacherName: shared.teacherName,
    subjects: shared.sortedSubjects,
    students: rankedStudents,
    statistics: {
      totalStudents,
      femaleStudents,
      passedStudents: passedStudents.length,
      passedFemaleStudents: passedStudents.filter((student) =>
        L.isFemaleGender(student.gender),
      ).length,
      failedStudents: failedStudents.length,
      failedFemaleStudents: failedStudents.filter((student) =>
        L.isFemaleGender(student.gender),
      ).length,
    },
    rules: {
      system: "KHM_MOEYS",
      passingAverage: L.KHMER_MONTH_PASSING_AVERAGE,
      semesterOneEnglishBaseline: L.ENGLISH_SCORE_BASELINE,
      usesSemesterOneEnglishRule,
    },
    generatedAt: new Date().toISOString(),
  };
}
