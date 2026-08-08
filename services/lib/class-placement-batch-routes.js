"use strict";

const { createHash } = require("node:crypto");

const gradeKey = (value) => String(value ?? "").replace(/\D/g, "");
const historicalStatuses = new Set(["ENDED", "ARCHIVED"]);

function httpError(statusCode, message, details) {
  return Object.assign(new Error(message), { statusCode, details });
}

function parseAssignments(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    studentId: String(item?.studentId || ""),
    classId: String(item?.classId || ""),
    pinned: Boolean(item?.pinned),
  })).filter((item) => item.studentId && item.classId);
}

function placementFingerprint({ academicYearId, grade, assignments, classes }) {
  const source = JSON.stringify({
    academicYearId,
    grade,
    assignments: [...assignments].sort((a, b) => a.studentId.localeCompare(b.studentId)),
    classes: [...classes].map((item) => ({ id: item.id, count: item._count.studentClasses, capacity: item.capacity })).sort((a, b) => a.id.localeCompare(b.id)),
  });
  return createHash("sha256").update(source).digest("hex");
}

function batchInclude() {
  return { versions: { orderBy: { version: "desc" }, take: 1 } };
}

function batchResponse(batch) {
  if (!batch) return null;
  const { versions = [], ...base } = batch;
  return { ...base, latestVersion: versions[0] || null };
}

async function validateAssignments(tx, { schoolId, academicYearId, grade, assignments }) {
  if (!assignments.length || new Set(assignments.map((item) => item.studentId)).size !== assignments.length) {
    throw httpError(400, "A non-duplicate assignment list is required");
  }
  const year = await tx.academicYear.findFirst({
    where: { id: academicYearId, schoolId },
    select: { id: true, startDate: true, status: true },
  });
  if (!year) throw httpError(404, "Academic year not found");
  if (historicalStatuses.has(year.status)) throw httpError(409, "Historical academic years are read-only");

  const studentIds = assignments.map((item) => item.studentId);
  const classIds = [...new Set(assignments.map((item) => item.classId))];
  const [classes, progressions, existingEnrollments] = await Promise.all([
    tx.class.findMany({
      where: { id: { in: classIds }, schoolId, academicYearId },
      select: { id: true, grade: true, capacity: true, _count: { select: { studentClasses: { where: { status: "ACTIVE", endedAt: null } } } } },
    }),
    tx.studentProgression.findMany({
      where: { studentId: { in: studentIds }, toAcademicYearId: academicYearId, toClassId: null, student: { schoolId, recordStatus: "ACTIVE" } },
      select: { id: true, studentId: true, toGrade: true, student: { select: { classId: true } } },
    }),
    tx.studentClass.findMany({
      where: { studentId: { in: studentIds }, status: "ACTIVE", endedAt: null, class: { schoolId, academicYearId } },
      select: { studentId: true },
    }),
  ]);
  if (classes.length !== classIds.length || classes.some((item) => gradeKey(item.grade) !== grade)) {
    throw httpError(400, "One or more target classes are invalid for this year and grade");
  }
  if (progressions.length !== studentIds.length || progressions.some((item) => gradeKey(item.toGrade) !== grade)) {
    throw httpError(409, "One or more students are no longer pending placement for this grade");
  }
  if (existingEnrollments.length) throw httpError(409, "One or more students were already placed. Reload the workspace.");

  const newCounts = new Map();
  assignments.forEach((item) => newCounts.set(item.classId, (newCounts.get(item.classId) || 0) + 1));
  const classById = new Map(classes.map((item) => [item.id, item]));
  for (const [classId, count] of newCounts) {
    const target = classById.get(classId);
    if (target.capacity != null && target._count.studentClasses + count > target.capacity) {
      throw httpError(409, "Placement would exceed one or more class capacities");
    }
  }
  return { year, classes, progressions, newCounts };
}

async function requireCompleteGradePool(tx, { schoolId, academicYearId, grade, assignments }) {
  const pending = await tx.studentProgression.findMany({
    where: { toAcademicYearId: academicYearId, toClassId: null, student: { schoolId, recordStatus: "ACTIVE" } },
    select: { studentId: true, toGrade: true },
  });
  const pendingIds = pending.filter((item) => gradeKey(item.toGrade) === grade).map((item) => item.studentId).sort();
  const assignedIds = assignments.map((item) => item.studentId).sort();
  if (pendingIds.length !== assignedIds.length || pendingIds.some((id, index) => id !== assignedIds[index])) {
    throw httpError(409, "The draft must include every student currently pending placement in this grade", {
      pendingCount: pendingIds.length,
      assignmentCount: assignedIds.length,
    });
  }
}

function registerClassPlacementBatchRoutes({ app, prisma, requireClassAdmin, cache, Prisma }) {
  app.get("/classes/placement/batches/:academicYearId/:grade", requireClassAdmin, async (req, res) => {
    try {
      const batches = await prisma.classPlacementBatch.findMany({
        where: { schoolId: req.user.schoolId, academicYearId: req.params.academicYearId, grade: gradeKey(req.params.grade) },
        include: batchInclude(),
        orderBy: { updatedAt: "desc" },
      });
      return res.json({ success: true, data: batches.map(batchResponse) });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || "Failed to load placement batches" });
    }
  });

  app.post("/classes/placement/batches", requireClassAdmin, async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const actorId = req.user.userId;
      const academicYearId = String(req.body.academicYearId || "");
      const grade = gradeKey(req.body.grade);
      const assignments = parseAssignments(req.body.assignments);
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${schoolId}), hashtext(${`${academicYearId}:${grade}:placement-draft`})) IS NULL AS "lockAcquired"`;
        const validation = await validateAssignments(tx, { schoolId, academicYearId, grade, assignments });
        const versionData = {
          strategy: req.body.strategy === "MULTI_FACTOR_BALANCED" ? "MULTI_FACTOR_BALANCED" : req.body.strategy === "ACADEMIC_BALANCED" ? "ACADEMIC_BALANCED" : "RANDOM_BALANCED",
          seed: String(req.body.seed || `${academicYearId}:${grade}:draft`),
          classIds: [...new Set(assignments.map((item) => item.classId))],
          assignments,
          summary: req.body.summary || { assignmentCount: assignments.length, classCounts: Object.fromEntries(validation.newCounts) },
          sourceFingerprint: placementFingerprint({ academicYearId, grade, assignments, classes: validation.classes }),
          createdBy: actorId,
        };

        const requestedBatchId = String(req.body.batchId || "");
        if (requestedBatchId) {
          const current = await tx.classPlacementBatch.findFirst({ where: { id: requestedBatchId, schoolId, academicYearId, grade } });
          if (!current) throw httpError(404, "Placement batch not found");
          if (current.status !== "DRAFT") throw httpError(409, "Only draft batches can be edited");
          if (Number(req.body.expectedVersion) !== current.currentVersion) throw httpError(409, "This draft was changed by another administrator. Reload it first.");
          const nextVersion = current.currentVersion + 1;
          await tx.classPlacementBatchVersion.create({ data: { batchId: current.id, version: nextVersion, ...versionData } });
          await tx.classPlacementBatch.update({ where: { id: current.id }, data: { currentVersion: nextVersion, notes: req.body.notes == null ? current.notes : String(req.body.notes) } });
          return tx.classPlacementBatch.findUnique({ where: { id: current.id }, include: batchInclude() });
        }

        return tx.classPlacementBatch.create({
          data: {
            schoolId,
            academicYearId,
            grade,
            createdBy: actorId,
            notes: req.body.notes == null ? null : String(req.body.notes),
            versions: { create: { version: 1, ...versionData } },
          },
          include: batchInclude(),
        });
      }, { maxWait: 30_000, timeout: 120_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return res.status(201).json({ success: true, data: batchResponse(result) });
    } catch (error) {
      const concurrent = error?.code === "P2034";
      return res.status(concurrent ? 409 : error.statusCode || 500).json({ success: false, message: concurrent ? "The draft changed concurrently. Reload and try again." : error.message || "Failed to save placement draft", details: error.details });
    }
  });

  app.post("/classes/placement/batches/:id/submit", requireClassAdmin, async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const actorId = req.user.userId;
      const result = await prisma.$transaction(async (tx) => {
        const batch = await tx.classPlacementBatch.findFirst({ where: { id: req.params.id, schoolId }, include: batchInclude() });
        if (!batch) throw httpError(404, "Placement batch not found");
        if (batch.status !== "DRAFT") throw httpError(409, "Only a draft can be submitted");
        const assignments = parseAssignments(batch.versions[0]?.assignments);
        const validation = await validateAssignments(tx, { schoolId, academicYearId: batch.academicYearId, grade: batch.grade, assignments });
        const fingerprint = placementFingerprint({ academicYearId: batch.academicYearId, grade: batch.grade, assignments, classes: validation.classes });
        if (batch.versions[0]?.sourceFingerprint && batch.versions[0].sourceFingerprint !== fingerprint) throw httpError(409, "Class capacity or roster changed after this version was saved. Reload and save a new version.");
        await requireCompleteGradePool(tx, { schoolId, academicYearId: batch.academicYearId, grade: batch.grade, assignments });
        const updated = await tx.classPlacementBatch.updateMany({ where: { id: batch.id, schoolId, status: "DRAFT", currentVersion: batch.currentVersion }, data: { status: "IN_REVIEW", submittedBy: actorId, submittedAt: new Date() } });
        if (updated.count !== 1) throw httpError(409, "The draft changed concurrently");
        return tx.classPlacementBatch.findUnique({ where: { id: batch.id }, include: batchInclude() });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return res.json({ success: true, data: batchResponse(result) });
    } catch (error) {
      const concurrent = error?.code === "P2034";
      return res.status(concurrent ? 409 : error.statusCode || 500).json({ success: false, message: concurrent ? "The draft changed concurrently" : error.message || "Failed to submit placement draft", details: error.details });
    }
  });

  app.post("/classes/placement/batches/:id/approve", requireClassAdmin, async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const actorId = req.user.userId;
      const batch = await prisma.classPlacementBatch.findFirst({ where: { id: req.params.id, schoolId }, include: batchInclude() });
      if (!batch) return res.status(404).json({ success: false, message: "Placement batch not found" });
      if (batch.status !== "IN_REVIEW") return res.status(409).json({ success: false, message: "Only a submitted batch can be approved" });
      if (batch.submittedBy === actorId) {
        const eligibleApprovers = await prisma.user.count({ where: { schoolId, isActive: true, role: { in: ["ADMIN", "STAFF", "SUPER_ADMIN"] } } });
        if (eligibleApprovers > 1) return res.status(409).json({ success: false, message: "A different administrator must approve this placement batch" });
      }
      const updated = await prisma.classPlacementBatch.updateMany({ where: { id: batch.id, schoolId, status: "IN_REVIEW", currentVersion: batch.currentVersion }, data: { status: "APPROVED", approvedBy: actorId, approvedAt: new Date() } });
      if (updated.count !== 1) return res.status(409).json({ success: false, message: "The batch changed concurrently" });
      const result = await prisma.classPlacementBatch.findUnique({ where: { id: batch.id }, include: batchInclude() });
      return res.json({ success: true, data: batchResponse(result) });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || "Failed to approve placement batch" });
    }
  });

  app.post("/classes/placement/batches/:id/apply", requireClassAdmin, async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const actorId = req.user.userId;
      const result = await prisma.$transaction(async (tx) => {
        const batch = await tx.classPlacementBatch.findFirst({ where: { id: req.params.id, schoolId }, include: batchInclude() });
        if (!batch) throw httpError(404, "Placement batch not found");
        if (batch.status !== "APPROVED") throw httpError(409, "The placement batch must be approved before apply");
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${schoolId}), hashtext(${`${batch.academicYearId}:${batch.grade}:placement`})) IS NULL AS "lockAcquired"`;
        const assignments = parseAssignments(batch.versions[0]?.assignments);
        const validation = await validateAssignments(tx, { schoolId, academicYearId: batch.academicYearId, grade: batch.grade, assignments });
        const fingerprint = placementFingerprint({ academicYearId: batch.academicYearId, grade: batch.grade, assignments, classes: validation.classes });
        if (batch.versions[0]?.sourceFingerprint && batch.versions[0].sourceFingerprint !== fingerprint) throw httpError(409, "Class capacity or roster changed after approval. Create and approve a new draft.");
        await requireCompleteGradePool(tx, { schoolId, academicYearId: batch.academicYearId, grade: batch.grade, assignments });
        const progressionByStudent = new Map(validation.progressions.map((item) => [item.studentId, item]));
        const previousClassIds = Object.fromEntries(validation.progressions.map((item) => [item.studentId, item.student.classId]));
        const created = await tx.studentClass.createMany({ data: assignments.map((item) => ({ studentId: item.studentId, classId: item.classId, academicYearId: batch.academicYearId, enrolledAt: validation.year.startDate, startedAt: validation.year.startDate, entryReason: "ADMIN_PLACEMENT", status: "ACTIVE", createdById: actorId })) });
        if (created.count !== assignments.length) throw httpError(409, "Not every enrollment was created");
        for (const classId of [...new Set(assignments.map((item) => item.classId))]) {
          const ids = assignments.filter((item) => item.classId === classId).map((item) => item.studentId);
          const studentUpdate = await tx.student.updateMany({ where: { id: { in: ids }, schoolId }, data: { classId } });
          const progressionUpdate = await tx.studentProgression.updateMany({ where: { id: { in: ids.map((id) => progressionByStudent.get(id).id) }, toClassId: null }, data: { toClassId: classId } });
          if (studentUpdate.count !== ids.length || progressionUpdate.count !== ids.length) throw httpError(409, "Placement state changed concurrently");
        }
        const enrollments = await tx.studentClass.findMany({
          where: { studentId: { in: assignments.map((item) => item.studentId) }, academicYearId: batch.academicYearId, status: "ACTIVE", endedAt: null },
          select: { id: true, studentId: true, classId: true },
        });
        if (enrollments.length !== assignments.length) throw httpError(409, "Unable to snapshot every created enrollment");
        const appliedAt = new Date();
        const batchUpdate = await tx.classPlacementBatch.updateMany({
          where: { id: batch.id, schoolId, status: "APPROVED", currentVersion: batch.currentVersion },
          data: { status: "APPLIED", appliedBy: actorId, appliedAt, appliedSnapshot: { assignments, enrollmentIds: enrollments.map((item) => item.id), previousClassIds, appliedAt: appliedAt.toISOString() } },
        });
        if (batchUpdate.count !== 1) throw httpError(409, "Placement approval changed concurrently");
        await tx.platformAuditLog.create({ data: { actorId, action: "CLASS_PLACEMENT_BATCH_APPLIED", resourceType: "CLASS_PLACEMENT_BATCH", resourceId: batch.id, details: { schoolId, academicYearId: batch.academicYearId, grade: batch.grade, version: batch.currentVersion, assignedCount: created.count, classCounts: Object.fromEntries(validation.newCounts) } } });
        return { batchId: batch.id, assigned: created.count, classCounts: Object.fromEntries(validation.newCounts) };
      }, { maxWait: 30_000, timeout: 120_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      cache.clear();
      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      const concurrent = error?.code === "P2034";
      return res.status(concurrent ? 409 : error.statusCode || 500).json({ success: false, message: concurrent ? "Placement changed concurrently. Reload and try again." : error.message || "Failed to apply placement batch", details: error.details });
    }
  });

  app.post("/classes/placement/batches/:id/undo", requireClassAdmin, async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const actorId = req.user.userId;
      const result = await prisma.$transaction(async (tx) => {
        const batch = await tx.classPlacementBatch.findFirst({ where: { id: req.params.id, schoolId } });
        if (!batch) throw httpError(404, "Placement batch not found");
        if (batch.status !== "APPLIED") throw httpError(409, "Only an applied batch can be reversed");
        const snapshot = batch.appliedSnapshot || {};
        const assignments = parseAssignments(snapshot.assignments);
        const enrollmentIds = Array.isArray(snapshot.enrollmentIds) ? snapshot.enrollmentIds.map(String) : [];
        if (!assignments.length || enrollmentIds.length !== assignments.length) throw httpError(409, "The applied snapshot is incomplete and cannot be reversed automatically");
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${schoolId}), hashtext(${`${batch.academicYearId}:${batch.grade}:placement`})) IS NULL AS "lockAcquired"`;
        const activeEnrollments = await tx.studentClass.findMany({ where: { id: { in: enrollmentIds }, status: "ACTIVE", endedAt: null }, select: { id: true, studentId: true, classId: true } });
        if (activeEnrollments.length !== enrollmentIds.length) throw httpError(409, "One or more enrollments changed after apply and cannot be reversed as a batch");
        const expectedPairs = new Set(assignments.map((item) => `${item.studentId}:${item.classId}`));
        if (activeEnrollments.some((item) => !expectedPairs.has(`${item.studentId}:${item.classId}`))) throw httpError(409, "An applied enrollment no longer matches the approved snapshot");
        const pairs = assignments.map((item) => ({ studentId: item.studentId, classId: item.classId }));
        const [gradeCount, attendanceCount, transferCount] = await Promise.all([
          tx.grade.count({ where: { OR: pairs } }),
          tx.attendance.count({ where: { OR: pairs } }),
          tx.studentTransfer.count({ where: { OR: [{ sourceEnrollmentId: { in: enrollmentIds } }, { destinationEnrollmentId: { in: enrollmentIds } }] } }),
        ]);
        if (gradeCount || attendanceCount || transferCount) throw httpError(409, "Undo is blocked because grades, attendance, or transfers already depend on this placement", { gradeCount, attendanceCount, transferCount });
        const endedAt = new Date();
        const enrollmentUpdate = await tx.studentClass.updateMany({ where: { id: { in: enrollmentIds }, status: "ACTIVE", endedAt: null }, data: { status: "INACTIVE", endedAt, exitReason: "CORRECTION", endedById: actorId } });
        if (enrollmentUpdate.count !== enrollmentIds.length) throw httpError(409, "Enrollment state changed concurrently");
        const previousClassIds = snapshot.previousClassIds || {};
        let restoredProgressions = 0;
        for (const classId of [...new Set(assignments.map((item) => item.classId))]) {
          const ids = assignments.filter((item) => item.classId === classId).map((item) => item.studentId);
          const restored = await tx.studentProgression.updateMany({ where: { studentId: { in: ids }, toAcademicYearId: batch.academicYearId, toClassId: classId }, data: { toClassId: null } });
          restoredProgressions += restored.count;
        }
        if (restoredProgressions !== assignments.length) throw httpError(409, "Progression history changed after apply and cannot be reversed as a batch");
        const restoreGroups = new Map();
        assignments.forEach((item) => {
          const previous = previousClassIds[item.studentId] || null;
          const key = previous || "__NULL__";
          restoreGroups.set(key, [...(restoreGroups.get(key) || []), item.studentId]);
        });
        let restoredStudents = 0;
        for (const [key, ids] of restoreGroups) {
          const restored = await tx.student.updateMany({ where: { id: { in: ids }, schoolId, classId: { in: [...new Set(assignments.filter((item) => ids.includes(item.studentId)).map((item) => item.classId))] } }, data: { classId: key === "__NULL__" ? null : key } });
          restoredStudents += restored.count;
        }
        if (restoredStudents !== assignments.length) throw httpError(409, "Student class pointers changed after apply and cannot be reversed as a batch");
        const reversedAt = new Date();
        const batchUpdate = await tx.classPlacementBatch.updateMany({ where: { id: batch.id, schoolId, status: "APPLIED" }, data: { status: "REVERSED", reversedBy: actorId, reversedAt } });
        if (batchUpdate.count !== 1) throw httpError(409, "Placement batch changed concurrently");
        await tx.platformAuditLog.create({ data: { actorId, action: "CLASS_PLACEMENT_BATCH_REVERSED", resourceType: "CLASS_PLACEMENT_BATCH", resourceId: batch.id, details: { schoolId, academicYearId: batch.academicYearId, grade: batch.grade, enrollmentCount: enrollmentIds.length, reason: String(req.body.reason || "Administrative correction") } } });
        return { batchId: batch.id, reversed: enrollmentIds.length };
      }, { maxWait: 30_000, timeout: 120_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      cache.clear();
      return res.json({ success: true, data: result });
    } catch (error) {
      const concurrent = error?.code === "P2034";
      return res.status(concurrent ? 409 : error.statusCode || 500).json({ success: false, message: concurrent ? "Placement changed concurrently. Reload and try again." : error.message || "Failed to reverse placement batch", details: error.details });
    }
  });
}

module.exports = { registerClassPlacementBatchRoutes };
