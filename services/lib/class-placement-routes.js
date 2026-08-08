"use strict";

const { buildClassPlacement } = require("./class-placement");
const gradeKey = (value) => String(value ?? "").replace(/\D/g, "");
const sectionName = (index) => {
  let value = index;
  let label = "";
  do { label = String.fromCharCode(65 + (value % 26)) + label; value = Math.floor(value / 26) - 1; } while (value >= 0);
  return label;
};

function registerClassPlacementRoutes({ app, prisma, requireClassAdmin, cache, Prisma }) {
  const loadContext = async (schoolId, academicYearId, grade) => {
    const academicYear = await prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId }, select: { id: true, name: true, startDate: true, status: true } });
    if (!academicYear) return null;
    const [allClasses, progressions] = await Promise.all([
      prisma.class.findMany({ where: { schoolId, academicYearId }, select: { id: true, name: true, grade: true, section: true, capacity: true, _count: { select: { studentClasses: { where: { status: "ACTIVE", endedAt: null } } } } }, orderBy: [{ section: "asc" }, { name: "asc" }] }),
      prisma.studentProgression.findMany({ where: { toAcademicYearId: academicYearId, toClassId: null, student: { schoolId, recordStatus: "ACTIVE" } }, select: { id: true, studentId: true, toGrade: true, fromClass: { select: { id: true, name: true, grade: true, section: true } }, student: { select: { id: true, studentId: true, firstName: true, lastName: true, englishFirstName: true, englishLastName: true, gender: true, photoUrl: true, customFields: true } } } }),
    ]);
    const classes = allClasses.filter((item) => gradeKey(item.grade) === gradeKey(grade));
    const eligible = progressions.filter((item) => gradeKey(item.toGrade) === gradeKey(grade));
    const decisions = eligible.length ? await prisma.yearEndDecision.findMany({ where: { studentId: { in: eligible.map((item) => item.studentId) }, cycle: { schoolId, toAcademicYearId: academicYearId } }, select: { studentId: true, academicAverage: true, attendanceRate: true } }) : [];
    const evidence = new Map(decisions.map((item) => [item.studentId, item]));
    eligible.sort((a, b) => (evidence.get(b.studentId)?.academicAverage ?? -1) - (evidence.get(a.studentId)?.academicAverage ?? -1) || a.studentId.localeCompare(b.studentId));
    return {
      academicYear, grade: gradeKey(grade),
      classes: classes.map((item) => ({ id: item.id, name: item.name, grade: item.grade, section: item.section, capacity: item.capacity, currentCount: item._count.studentClasses })),
      candidates: eligible.map((item, index) => ({ ...item.student, progressionId: item.id, plannedGrade: item.toGrade, previousClass: item.fromClass, academicAverage: evidence.get(item.studentId)?.academicAverage ?? null, attendanceRate: evidence.get(item.studentId)?.attendanceRate ?? null, academicRank: index + 1 })),
    };
  };

  app.get("/classes/placement/:academicYearId/:grade", requireClassAdmin, async (req, res) => {
    try {
      const data = await loadContext(req.user.schoolId, req.params.academicYearId, req.params.grade);
      return data ? res.json({ success: true, data }) : res.status(404).json({ success: false, message: "Academic year not found" });
    } catch (error) { return res.status(500).json({ success: false, message: "Failed to load placement workspace", error: error.message }); }
  });

  app.post("/classes/placement/generate-classes", requireClassAdmin, async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const academicYearId = String(req.body.academicYearId || "");
      const grade = gradeKey(req.body.grade);
      const capacity = Math.min(200, Math.max(1, Number(req.body.capacity) || 50));
      const context = await loadContext(schoolId, academicYearId, grade);
      if (!context) return res.status(404).json({ success: false, message: "Academic year not found" });
      if (["ENDED", "ARCHIVED"].includes(context.academicYear.status)) return res.status(409).json({ success: false, message: "Historical academic years are read-only" });
      const requested = Number(req.body.classCount);
      const count = Math.min(52, Math.max(1, requested > 0 ? Math.floor(requested) : Math.ceil(context.candidates.length / capacity) || 1));
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${schoolId}), hashtext(${`${academicYearId}:${grade}:class-shells`})) IS NULL AS "lockAcquired"`;
        const existing = await tx.class.findMany({ where: { schoolId, academicYearId }, select: { section: true, grade: true } });
        const sections = new Set(existing.filter((item) => gradeKey(item.grade) === grade).map((item) => String(item.section || "").toUpperCase()));
        const data = Array.from({ length: count }, (_, index) => sectionName(index)).filter((section) => !sections.has(section)).map((section) => ({ schoolId, academicYearId, name: `Grade ${grade}${section}`, grade, section, capacity }));
        if (data.length) await tx.class.createMany({ data });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      cache.clear();
      return res.status(201).json({ success: true, data: await loadContext(schoolId, academicYearId, grade) });
    } catch (error) { const status = error?.code === "P2034" ? 409 : 500; return res.status(status).json({ success: false, message: status === 409 ? "Class structure changed concurrently" : "Failed to generate class structure", error: error.message }); }
  });

  app.post("/classes/placement/preview", requireClassAdmin, async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const academicYearId = String(req.body.academicYearId || "");
      const grade = gradeKey(req.body.grade);
      const context = await loadContext(schoolId, academicYearId, grade);
      if (!context) return res.status(404).json({ success: false, message: "Academic year not found" });
      const ids = Array.isArray(req.body.classIds) ? [...new Set(req.body.classIds.map(String))] : context.classes.map((item) => item.id);
      const classes = context.classes.filter((item) => ids.includes(item.id));
      if (!classes.length || classes.length !== ids.length) return res.status(400).json({ success: false, message: "Invalid target classes" });
      const pinned = Array.isArray(req.body.pinned) ? req.body.pinned.map((item) => ({ studentId: String(item.studentId), classId: String(item.classId) })) : [];
      const candidateIds = new Set(context.candidates.map((item) => item.id));
      const classIds = new Set(classes.map((item) => item.id));
      if (pinned.some((item) => !candidateIds.has(item.studentId) || !classIds.has(item.classId)) || new Set(pinned.map((item) => item.studentId)).size !== pinned.length) return res.status(400).json({ success: false, message: "Invalid pinned assignments" });
      const strategy = req.body.strategy === "MULTI_FACTOR_BALANCED" ? "MULTI_FACTOR_BALANCED" : req.body.strategy === "ACADEMIC_BALANCED" ? "ACADEMIC_BALANCED" : "RANDOM_BALANCED";
      const seed = String(req.body.seed || `${academicYearId}:${grade}:default`);
      const allocation = buildClassPlacement({ students: context.candidates.map((item) => ({ id: item.id, score: item.academicAverage, gender: item.gender })), classes, pinned, strategy, seed });
      if (allocation.assignments.filter((item) => item.pinned).length !== pinned.length) return res.status(409).json({ success: false, message: "Pinned assignments exceed capacity" });
      return res.json({ success: true, data: { ...context, strategy, seed, assignments: allocation.assignments, unassignedStudentIds: allocation.unassignedStudentIds, classSummaries: [] } });
    } catch (error) { return res.status(500).json({ success: false, message: "Failed to preview placement", error: error.message }); }
  });

  app.post("/classes/placement/apply", requireClassAdmin, (_req, res) => res.status(409).json({ success: false, message: "Save, submit, and approve a placement batch before apply" }));

  app.post("/classes/placement/legacy-apply-disabled", requireClassAdmin, async (req, res) => {
    if (req.path.includes("legacy-apply-disabled")) return res.status(410).json({ success: false, message: "Legacy direct placement is disabled" });
    try {
      const schoolId = req.user.schoolId;
      const academicYearId = String(req.body.academicYearId || "");
      const grade = gradeKey(req.body.grade);
      const assignments = Array.isArray(req.body.assignments) ? req.body.assignments.map((item) => ({ studentId: String(item.studentId), classId: String(item.classId) })) : [];
      if (!assignments.length || new Set(assignments.map((item) => item.studentId)).size !== assignments.length) return res.status(400).json({ success: false, message: "A non-duplicate assignment list is required" });
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${schoolId}), hashtext(${`${academicYearId}:${grade}:placement`})) IS NULL AS "lockAcquired"`;
        const year = await tx.academicYear.findFirst({ where: { id: academicYearId, schoolId }, select: { startDate: true, status: true } });
        if (!year) throw Object.assign(new Error("Academic year not found"), { statusCode: 404 });
        if (["ENDED", "ARCHIVED"].includes(year.status)) throw Object.assign(new Error("Historical academic years are read-only"), { statusCode: 409 });
        const studentIds = assignments.map((item) => item.studentId);
        const targetIds = [...new Set(assignments.map((item) => item.classId))];
        const [classes, progressions, enrollments] = await Promise.all([
          tx.class.findMany({ where: { id: { in: targetIds }, schoolId, academicYearId }, select: { id: true, grade: true, capacity: true, _count: { select: { studentClasses: { where: { status: "ACTIVE", endedAt: null } } } } } }),
          tx.studentProgression.findMany({ where: { studentId: { in: studentIds }, toAcademicYearId: academicYearId, toClassId: null, student: { schoolId, recordStatus: "ACTIVE" } }, select: { id: true, studentId: true, toGrade: true } }),
          tx.studentClass.findMany({ where: { studentId: { in: studentIds }, status: "ACTIVE", endedAt: null, class: { schoolId, academicYearId } }, select: { studentId: true } }),
        ]);
        if (classes.length !== targetIds.length || classes.some((item) => gradeKey(item.grade) !== grade)) throw Object.assign(new Error("Invalid target classes"), { statusCode: 400 });
        if (progressions.length !== studentIds.length || progressions.some((item) => gradeKey(item.toGrade) !== grade)) throw Object.assign(new Error("Students are no longer pending placement"), { statusCode: 409 });
        if (enrollments.length) throw Object.assign(new Error("Students were already placed. Reload preview."), { statusCode: 409 });
        const classById = new Map(classes.map((item) => [item.id, item]));
        const progressionByStudent = new Map(progressions.map((item) => [item.studentId, item]));
        const counts = new Map();
        assignments.forEach((item) => counts.set(item.classId, (counts.get(item.classId) || 0) + 1));
        for (const [classId, count] of counts) { const target = classById.get(classId); if (target.capacity != null && target._count.studentClasses + count > target.capacity) throw Object.assign(new Error("Placement exceeds class capacity"), { statusCode: 409 }); }
        const created = await tx.studentClass.createMany({ data: assignments.map((item) => ({ studentId: item.studentId, classId: item.classId, academicYearId, enrolledAt: year.startDate, startedAt: year.startDate, entryReason: "ADMIN_PLACEMENT", status: "ACTIVE", createdById: req.user.userId })) });
        if (created.count !== assignments.length) throw Object.assign(new Error("Not every enrollment was created"), { statusCode: 409 });
        for (const classId of targetIds) {
          const ids = assignments.filter((item) => item.classId === classId).map((item) => item.studentId);
          const studentUpdate = await tx.student.updateMany({ where: { id: { in: ids }, schoolId }, data: { classId } });
          const progressionUpdate = await tx.studentProgression.updateMany({ where: { id: { in: ids.map((id) => progressionByStudent.get(id).id) }, toClassId: null }, data: { toClassId: classId } });
          if (studentUpdate.count !== ids.length || progressionUpdate.count !== ids.length) throw Object.assign(new Error("Placement state changed concurrently"), { statusCode: 409 });
        }
        await tx.platformAuditLog.create({
          data: {
            actorId: req.user.userId,
            action: "CLASS_PLACEMENT_APPLIED",
            resourceType: "ACADEMIC_YEAR",
            resourceId: academicYearId,
            details: { schoolId, grade, assignedCount: created.count, classCounts: Object.fromEntries(counts) },
          },
        });
        return { assigned: created.count, classCounts: Object.fromEntries(counts) };
      }, { maxWait: 30000, timeout: 120000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      cache.clear();
      return res.status(201).json({ success: true, data: result });
    } catch (error) { const concurrent = error?.code === "P2034"; return res.status(concurrent ? 409 : error?.statusCode || 500).json({ success: false, message: concurrent ? "Another placement changed. Reload and try again." : error.message || "Failed to apply placement" }); }
  });
}

module.exports = { registerClassPlacementRoutes };
