-- Create enums for delegated attendance capabilities.
CREATE TYPE "DisciplineCapabilityProfile" AS ENUM ('ATTENDANCE_APL', 'DISCIPLINE_E', 'FULL_ATTENDANCE');
CREATE TYPE "DelegationScopeType" AS ENUM ('CLASS', 'GRADE', 'SCHOOL');
CREATE TYPE "DisciplineResponsibilityType" AS ENUM ('CLASS_LEADER', 'DISCIPLINE_COUNCIL', 'DISCIPLINE_TEACHER', 'CUSTOM');

-- Delegation assignments managed by admin.
CREATE TABLE "attendance_delegations" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "assigneeUserId" TEXT NOT NULL,
  "grantedByUserId" TEXT NOT NULL,
  "responsibilityType" "DisciplineResponsibilityType" NOT NULL DEFAULT 'CUSTOM',
  "capabilityProfile" "DisciplineCapabilityProfile" NOT NULL,
  "scopeType" "DelegationScopeType" NOT NULL,
  "classId" TEXT,
  "grade" TEXT,
  "notes" TEXT,
  "metadata" JSONB,
  "activeFrom" TIMESTAMP(3),
  "activeUntil" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attendance_delegations_pkey" PRIMARY KEY ("id")
);

-- School-level policy knobs for discipline workflows.
CREATE TABLE "discipline_policies" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "allowedExcusedReasonTemplates" JSONB DEFAULT '[]',
  "mandatoryExcusedReasonMinLength" INTEGER NOT NULL DEFAULT 3,
  "requireEscalationForExcused" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "discipline_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "discipline_policies_schoolId_key" ON "discipline_policies"("schoolId");
CREATE INDEX "attendance_delegations_schoolId_assigneeUserId_isActive_idx" ON "attendance_delegations"("schoolId", "assigneeUserId", "isActive");
CREATE INDEX "attendance_delegations_schoolId_scopeType_classId_idx" ON "attendance_delegations"("schoolId", "scopeType", "classId");
CREATE INDEX "attendance_delegations_schoolId_scopeType_grade_idx" ON "attendance_delegations"("schoolId", "scopeType", "grade");
CREATE INDEX "attendance_delegations_activeFrom_activeUntil_isActive_idx" ON "attendance_delegations"("activeFrom", "activeUntil", "isActive");
CREATE INDEX "discipline_policies_schoolId_idx" ON "discipline_policies"("schoolId");

ALTER TABLE "attendance_delegations"
ADD CONSTRAINT "attendance_delegations_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_delegations"
ADD CONSTRAINT "attendance_delegations_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_delegations"
ADD CONSTRAINT "attendance_delegations_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_delegations"
ADD CONSTRAINT "attendance_delegations_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "discipline_policies"
ADD CONSTRAINT "discipline_policies_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
