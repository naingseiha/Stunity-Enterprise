/*
  Warnings:

  - You are about to drop the column `academicYear` on the `classes` table. All the data in the column will be lost.
  - Added the required column `academicYearId` to the `classes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('PRIMARY_SCHOOL', 'MIDDLE_SCHOOL', 'HIGH_SCHOOL', 'COMPLETE_SCHOOL', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "AcademicYearStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('AUTOMATIC', 'MANUAL', 'REPEAT', 'NEW_ADMISSION', 'TRANSFER_IN', 'TRANSFER_OUT');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('SCHOOL_DAY', 'HOLIDAY', 'VACATION', 'EXAM_PERIOD', 'REGISTRATION', 'ORIENTATION', 'PARENT_MEETING', 'SPORTS_DAY', 'CULTURAL_EVENT', 'SPECIAL_EVENT');

-- AlterTable
ALTER TABLE "academic_years" ADD COLUMN     "copiedFromYearId" TEXT,
ADD COLUMN     "isPromotionDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "promotionDate" TIMESTAMP(3),
ADD COLUMN     "status" "AcademicYearStatus" NOT NULL DEFAULT 'PLANNING';

-- AlterTable
ALTER TABLE "classes" DROP COLUMN "academicYear",
ADD COLUMN     "academicYearId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "gradeRange" TEXT NOT NULL DEFAULT '7-12',
ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "schoolType" "SchoolType" NOT NULL DEFAULT 'HIGH_SCHOOL',
ADD COLUMN     "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "setupCompletedAt" TIMESTAMP(3),
ADD COLUMN     "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[];

-- CreateTable
CREATE TABLE "student_progressions" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromAcademicYearId" TEXT NOT NULL,
    "toAcademicYearId" TEXT NOT NULL,
    "fromClassId" TEXT NOT NULL,
    "toClassId" TEXT NOT NULL,
    "promotionType" "PromotionType" NOT NULL,
    "promotionDate" TIMESTAMP(3) NOT NULL,
    "promotedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_progressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_checklists" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "registrationDone" BOOLEAN NOT NULL DEFAULT false,
    "schoolInfoDone" BOOLEAN NOT NULL DEFAULT false,
    "calendarDone" BOOLEAN NOT NULL DEFAULT false,
    "subjectsDone" BOOLEAN NOT NULL DEFAULT false,
    "teachersAdded" BOOLEAN NOT NULL DEFAULT false,
    "classesCreated" BOOLEAN NOT NULL DEFAULT false,
    "studentsAdded" BOOLEAN NOT NULL DEFAULT false,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "totalSteps" INTEGER NOT NULL DEFAULT 7,
    "completionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "skippedSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_settings" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "defaultAcademicYearStart" TEXT NOT NULL DEFAULT '09-01',
    "defaultAcademicYearEnd" TEXT NOT NULL DEFAULT '08-31',
    "defaultTermCount" INTEGER NOT NULL DEFAULT 2,
    "defaultClassCapacity" INTEGER NOT NULL DEFAULT 40,
    "defaultSections" TEXT[] DEFAULT ARRAY['A', 'B', 'C']::TEXT[],
    "passingGrade" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "usesGPA" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_terms" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "termNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_types" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT,
    "name" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grading_scales" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grading_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_ranges" (
    "id" TEXT NOT NULL,
    "gradingScaleId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "minScore" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "gpa" DOUBLE PRECISION,
    "description" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#10B981',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_ranges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_calendars" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'School Calendar',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isSchoolDay" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_progressions_studentId_idx" ON "student_progressions"("studentId");

-- CreateIndex
CREATE INDEX "student_progressions_fromAcademicYearId_idx" ON "student_progressions"("fromAcademicYearId");

-- CreateIndex
CREATE INDEX "student_progressions_toAcademicYearId_idx" ON "student_progressions"("toAcademicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "student_progressions_studentId_fromAcademicYearId_toAcademi_key" ON "student_progressions"("studentId", "fromAcademicYearId", "toAcademicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_checklists_schoolId_key" ON "onboarding_checklists"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "school_settings_schoolId_key" ON "school_settings"("schoolId");

-- CreateIndex
CREATE INDEX "academic_terms_academicYearId_idx" ON "academic_terms"("academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "academic_terms_academicYearId_termNumber_key" ON "academic_terms"("academicYearId", "termNumber");

-- CreateIndex
CREATE INDEX "exam_types_academicYearId_idx" ON "exam_types"("academicYearId");

-- CreateIndex
CREATE INDEX "exam_types_termId_idx" ON "exam_types"("termId");

-- CreateIndex
CREATE INDEX "grading_scales_academicYearId_idx" ON "grading_scales"("academicYearId");

-- CreateIndex
CREATE INDEX "grade_ranges_gradingScaleId_idx" ON "grade_ranges"("gradingScaleId");

-- CreateIndex
CREATE INDEX "academic_calendars_academicYearId_idx" ON "academic_calendars"("academicYearId");

-- CreateIndex
CREATE INDEX "calendar_events_calendarId_idx" ON "calendar_events"("calendarId");

-- CreateIndex
CREATE INDEX "calendar_events_startDate_idx" ON "calendar_events"("startDate");

-- CreateIndex
CREATE INDEX "calendar_events_type_idx" ON "calendar_events"("type");

-- CreateIndex
CREATE INDEX "academic_years_schoolId_status_idx" ON "academic_years"("schoolId", "status");

-- CreateIndex
CREATE INDEX "classes_academicYearId_idx" ON "classes"("academicYearId");

-- CreateIndex
CREATE INDEX "classes_schoolId_academicYearId_idx" ON "classes"("schoolId", "academicYearId");

-- CreateIndex
CREATE INDEX "students_schoolId_isAccountActive_idx" ON "students"("schoolId", "isAccountActive");

-- CreateIndex
CREATE INDEX "students_schoolId_firstName_lastName_idx" ON "students"("schoolId", "firstName", "lastName");

-- CreateIndex
CREATE INDEX "students_schoolId_createdAt_idx" ON "students"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "teachers_schoolId_position_idx" ON "teachers"("schoolId", "position");

-- CreateIndex
CREATE INDEX "teachers_schoolId_createdAt_idx" ON "teachers"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "teachers_email_idx" ON "teachers"("email");

-- CreateIndex
CREATE INDEX "users_schoolId_role_isActive_idx" ON "users"("schoolId", "role", "isActive");

-- CreateIndex
CREATE INDEX "users_schoolId_isActive_idx" ON "users"("schoolId", "isActive");

-- AddForeignKey
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_copiedFromYearId_fkey" FOREIGN KEY ("copiedFromYearId") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progressions" ADD CONSTRAINT "student_progressions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progressions" ADD CONSTRAINT "student_progressions_fromAcademicYearId_fkey" FOREIGN KEY ("fromAcademicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progressions" ADD CONSTRAINT "student_progressions_toAcademicYearId_fkey" FOREIGN KEY ("toAcademicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progressions" ADD CONSTRAINT "student_progressions_fromClassId_fkey" FOREIGN KEY ("fromClassId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progressions" ADD CONSTRAINT "student_progressions_toClassId_fkey" FOREIGN KEY ("toClassId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_checklists" ADD CONSTRAINT "onboarding_checklists_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_settings" ADD CONSTRAINT "school_settings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_terms" ADD CONSTRAINT "academic_terms_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_types" ADD CONSTRAINT "exam_types_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_types" ADD CONSTRAINT "exam_types_termId_fkey" FOREIGN KEY ("termId") REFERENCES "academic_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_scales" ADD CONSTRAINT "grading_scales_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_ranges" ADD CONSTRAINT "grade_ranges_gradingScaleId_fkey" FOREIGN KEY ("gradingScaleId") REFERENCES "grading_scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_calendars" ADD CONSTRAINT "academic_calendars_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "academic_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
