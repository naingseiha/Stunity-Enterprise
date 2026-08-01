CREATE TYPE "AdmissionApplicantType" AS ENUM ('NEW_STUDENT', 'RETURNING_STUDENT', 'TRANSFER_IN');
CREATE TYPE "AdmissionApplicationStatus" AS ENUM ('DRAFT', 'RECEIVED', 'UNDER_REVIEW', 'WAITLISTED', 'APPROVED', 'REJECTED', 'ENROLLED', 'WITHDRAWN');
CREATE TYPE "AdmissionApplicationSource" AS ENUM ('STAFF_ENTRY', 'SELF_SERVICE', 'SCHOOL_TRANSFER');

CREATE TABLE "admission_applications" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "applicantType" "AdmissionApplicantType" NOT NULL DEFAULT 'NEW_STUDENT',
    "status" "AdmissionApplicationStatus" NOT NULL DEFAULT 'RECEIVED',
    "source" "AdmissionApplicationSource" NOT NULL DEFAULT 'STAFF_ENTRY',
    "studentId" TEXT,
    "targetClassId" TEXT,
    "requestedGrade" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "englishFirstName" TEXT,
    "englishLastName" TEXT,
    "gender" "Gender" NOT NULL,
    "dateOfBirth" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "email" TEXT,
    "placeOfBirth" TEXT,
    "currentAddress" TEXT,
    "fatherName" TEXT,
    "motherName" TEXT,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "previousSchool" TEXT,
    "previousGrade" TEXT,
    "documents" JSONB,
    "customFields" JSONB,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "enrolledAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "admission_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admission_application_events" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "fromStatus" "AdmissionApplicationStatus",
    "toStatus" "AdmissionApplicationStatus",
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admission_application_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admission_applications_schoolId_applicationNumber_key" ON "admission_applications"("schoolId", "applicationNumber");
CREATE UNIQUE INDEX "admission_applications_schoolId_academicYearId_studentId_key" ON "admission_applications"("schoolId", "academicYearId", "studentId");
CREATE INDEX "admission_applications_school_year_status_created_idx" ON "admission_applications"("schoolId", "academicYearId", "status", "createdAt" DESC);
CREATE INDEX "admission_applications_school_type_status_idx" ON "admission_applications"("schoolId", "applicantType", "status");
CREATE INDEX "admission_applications_school_name_idx" ON "admission_applications"("schoolId", "firstName", "lastName");
CREATE INDEX "admission_applications_studentId_idx" ON "admission_applications"("studentId");
CREATE INDEX "admission_application_events_application_created_idx" ON "admission_application_events"("applicationId", "createdAt");
CREATE INDEX "admission_application_events_actorId_idx" ON "admission_application_events"("actorId");

ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_targetClassId_fkey" FOREIGN KEY ("targetClassId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "admission_application_events" ADD CONSTRAINT "admission_application_events_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "admission_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admission_application_events" ADD CONSTRAINT "admission_application_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
