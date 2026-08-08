-- CreateEnum
CREATE TYPE "YearEndCycleStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'FINALIZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "YearEndDecisionOutcome" AS ENUM ('PENDING', 'PROMOTE', 'CONDITIONAL_PROMOTE', 'REPEAT', 'GRADUATE', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "YearEndDecisionSource" AS ENUM ('SYSTEM', 'MANUAL', 'OVERRIDE');

-- CreateTable
CREATE TABLE "promotion_policies" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "passAverage" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "minAttendanceRate" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "terminalGrade" INTEGER NOT NULL DEFAULT 12,
    "maxUnexcusedAbsences" INTEGER,
    "maxDisciplineIncidents" INTEGER,
    "requireCompleteGrades" BOOLEAN NOT NULL DEFAULT false,
    "allowConditionalPromotion" BOOLEAN NOT NULL DEFAULT true,
    "allowSupplementaryExam" BOOLEAN NOT NULL DEFAULT true,
    "requireReasonForOverride" BOOLEAN NOT NULL DEFAULT true,
    "requireSecondApproval" BOOLEAN NOT NULL DEFAULT false,
    "additionalRules" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "year_end_cycles" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "fromAcademicYearId" TEXT NOT NULL,
    "toAcademicYearId" TEXT NOT NULL,
    "status" "YearEndCycleStatus" NOT NULL DEFAULT 'DRAFT',
    "policySnapshot" JSONB NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "finalizedBy" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "year_end_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "year_end_decisions" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromClassId" TEXT NOT NULL,
    "targetClassId" TEXT,
    "recommendedOutcome" "YearEndDecisionOutcome" NOT NULL,
    "finalOutcome" "YearEndDecisionOutcome" NOT NULL,
    "decisionSource" "YearEndDecisionSource" NOT NULL DEFAULT 'SYSTEM',
    "reasonCode" TEXT,
    "reasonDetails" TEXT,
    "academicAverage" DOUBLE PRECISION,
    "attendanceRate" DOUBLE PRECISION,
    "totalAttendanceSessions" INTEGER NOT NULL DEFAULT 0,
    "absentCount" INTEGER NOT NULL DEFAULT 0,
    "excusedCount" INTEGER NOT NULL DEFAULT 0,
    "lateCount" INTEGER NOT NULL DEFAULT 0,
    "disciplineIncidentCount" INTEGER,
    "evidence" JSONB DEFAULT '{}',
    "interventions" JSONB DEFAULT '[]',
    "interventionStatus" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "year_end_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "year_end_decision_events" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromOutcome" "YearEndDecisionOutcome",
    "toOutcome" "YearEndDecisionOutcome",
    "reasonCode" TEXT,
    "notes" TEXT,
    "actorId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "year_end_decision_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promotion_policies_schoolId_key" ON "promotion_policies"("schoolId");
CREATE UNIQUE INDEX "year_end_cycles_schoolId_fromAcademicYearId_toAcademicYearId_key" ON "year_end_cycles"("schoolId", "fromAcademicYearId", "toAcademicYearId");
CREATE INDEX "year_end_cycles_schoolId_status_idx" ON "year_end_cycles"("schoolId", "status");
CREATE INDEX "year_end_cycles_fromAcademicYearId_idx" ON "year_end_cycles"("fromAcademicYearId");
CREATE INDEX "year_end_cycles_toAcademicYearId_idx" ON "year_end_cycles"("toAcademicYearId");
CREATE UNIQUE INDEX "year_end_decisions_cycleId_studentId_key" ON "year_end_decisions"("cycleId", "studentId");
CREATE INDEX "year_end_decisions_cycleId_finalOutcome_idx" ON "year_end_decisions"("cycleId", "finalOutcome");
CREATE INDEX "year_end_decisions_studentId_idx" ON "year_end_decisions"("studentId");
CREATE INDEX "year_end_decisions_fromClassId_idx" ON "year_end_decisions"("fromClassId");
CREATE INDEX "year_end_decisions_targetClassId_idx" ON "year_end_decisions"("targetClassId");
CREATE INDEX "year_end_decision_events_decisionId_createdAt_idx" ON "year_end_decision_events"("decisionId", "createdAt");
CREATE INDEX "year_end_decision_events_actorId_idx" ON "year_end_decision_events"("actorId");

-- Fail closed if legacy data already contains two simultaneously-active
-- enrollments for one student in one academic year. This intentionally avoids
-- guessing which row is authoritative during deployment.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "student_classes"
        WHERE "status" = 'ACTIVE'
          AND "endedAt" IS NULL
          AND "academicYearId" IS NOT NULL
        GROUP BY "studentId", "academicYearId"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot enable year-end integrity: duplicate active student enrollments must be resolved first';
    END IF;
END $$;

CREATE UNIQUE INDEX "student_classes_one_active_enrollment_per_year_idx"
ON "student_classes"("studentId", "academicYearId")
WHERE "status" = 'ACTIVE' AND "endedAt" IS NULL AND "academicYearId" IS NOT NULL;

-- Database-level tenant guards provide defense in depth for direct SQL,
-- maintenance scripts, and future API code paths.
CREATE OR REPLACE FUNCTION "enforce_year_end_cycle_tenant"()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM "academic_years" source_year
        JOIN "academic_years" target_year ON target_year."id" = NEW."toAcademicYearId"
        WHERE source_year."id" = NEW."fromAcademicYearId"
          AND source_year."schoolId" = NEW."schoolId"
          AND target_year."schoolId" = NEW."schoolId"
          AND target_year."startDate" > source_year."startDate"
    ) THEN
        RAISE EXCEPTION 'Year-end cycle academic years must belong to the same school and be chronological';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "year_end_cycles_tenant_guard"
BEFORE INSERT OR UPDATE OF "schoolId", "fromAcademicYearId", "toAcademicYearId"
ON "year_end_cycles"
FOR EACH ROW EXECUTE FUNCTION "enforce_year_end_cycle_tenant"();

CREATE OR REPLACE FUNCTION "enforce_year_end_decision_tenant"()
RETURNS TRIGGER AS $$
DECLARE
    cycle_school_id TEXT;
    source_year_id TEXT;
    target_year_id TEXT;
BEGIN
    SELECT "schoolId", "fromAcademicYearId", "toAcademicYearId"
      INTO cycle_school_id, source_year_id, target_year_id
    FROM "year_end_cycles"
    WHERE "id" = NEW."cycleId";

    IF cycle_school_id IS NULL
       OR NOT EXISTS (
           SELECT 1 FROM "students"
           WHERE "id" = NEW."studentId" AND "schoolId" = cycle_school_id
       )
       OR NOT EXISTS (
           SELECT 1 FROM "classes"
           WHERE "id" = NEW."fromClassId"
             AND "schoolId" = cycle_school_id
             AND "academicYearId" = source_year_id
       )
       OR (NEW."targetClassId" IS NOT NULL AND NOT EXISTS (
           SELECT 1 FROM "classes"
           WHERE "id" = NEW."targetClassId"
             AND "schoolId" = cycle_school_id
             AND "academicYearId" = target_year_id
       ))
    THEN
        RAISE EXCEPTION 'Year-end decision references data outside its school or academic years';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "year_end_decisions_tenant_guard"
BEFORE INSERT OR UPDATE OF "cycleId", "studentId", "fromClassId", "targetClassId"
ON "year_end_decisions"
FOR EACH ROW EXECUTE FUNCTION "enforce_year_end_decision_tenant"();

-- AddForeignKey
ALTER TABLE "promotion_policies" ADD CONSTRAINT "promotion_policies_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "year_end_cycles" ADD CONSTRAINT "year_end_cycles_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "year_end_cycles" ADD CONSTRAINT "year_end_cycles_fromAcademicYearId_fkey" FOREIGN KEY ("fromAcademicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "year_end_cycles" ADD CONSTRAINT "year_end_cycles_toAcademicYearId_fkey" FOREIGN KEY ("toAcademicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "year_end_decisions" ADD CONSTRAINT "year_end_decisions_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "year_end_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "year_end_decisions" ADD CONSTRAINT "year_end_decisions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "year_end_decisions" ADD CONSTRAINT "year_end_decisions_fromClassId_fkey" FOREIGN KEY ("fromClassId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "year_end_decisions" ADD CONSTRAINT "year_end_decisions_targetClassId_fkey" FOREIGN KEY ("targetClassId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "year_end_decision_events" ADD CONSTRAINT "year_end_decision_events_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "year_end_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
