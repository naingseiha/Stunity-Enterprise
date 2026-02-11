/*
  Warnings:

  - The values [ADMIN,MODERATOR,MEMBER] on the enum `ClubMemberRole` will be removed. If these variants are still used in the database, this will fail.
  - The values [SUBJECT,SKILL,RESEARCH,PROJECT,LANGUAGE,COMPETITION,TUTORING] on the enum `StudyClubType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `privacy` on the `study_clubs` table. All the data in the column will be lost.
  - You are about to drop the `study_club_members` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('HOMEWORK', 'QUIZ', 'MIDTERM', 'FINAL_EXAM', 'PROJECT', 'PRESENTATION', 'PARTICIPATION', 'LAB_WORK', 'OTHER');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED', 'LATE', 'GRADED', 'RESUBMISSION_REQUIRED');

-- CreateEnum
CREATE TYPE "AwardType" AS ENUM ('CERTIFICATE_OF_COMPLETION', 'HONOR_ROLL', 'PERFECT_ATTENDANCE', 'MOST_IMPROVED', 'BEST_PROJECT', 'EXCELLENCE_AWARD', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('DOCUMENT', 'VIDEO', 'LINK', 'IMAGE', 'AUDIO', 'PRESENTATION', 'CODE', 'QUIZ');

-- CreateEnum
CREATE TYPE "ClubMode" AS ENUM ('PUBLIC', 'INVITE_ONLY', 'APPROVAL_REQUIRED');

-- AlterEnum
ALTER TYPE "AttendanceStatus" ADD VALUE 'MEDICAL_LEAVE';

-- DropForeignKey
ALTER TABLE "study_club_members" DROP CONSTRAINT "study_club_members_clubId_fkey";

-- DropForeignKey
ALTER TABLE "study_club_members" DROP CONSTRAINT "study_club_members_userId_fkey";

-- DropIndex
DROP INDEX "study_clubs_privacy_idx";

-- DropTable (do this BEFORE changing enums)
DROP TABLE "study_club_members";

-- AlterEnum (Now safe to change since old table is dropped)
BEGIN;
CREATE TYPE "ClubMemberRole_new" AS ENUM ('OWNER', 'INSTRUCTOR', 'TEACHING_ASSISTANT', 'STUDENT', 'OBSERVER');
ALTER TYPE "ClubMemberRole" RENAME TO "ClubMemberRole_old";
ALTER TYPE "ClubMemberRole_new" RENAME TO "ClubMemberRole";
DROP TYPE "ClubMemberRole_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "StudyClubType_new" AS ENUM ('CASUAL_STUDY_GROUP', 'STRUCTURED_CLASS', 'PROJECT_GROUP', 'EXAM_PREP');
ALTER TABLE "study_clubs" ALTER COLUMN "clubType" DROP DEFAULT;
ALTER TABLE "study_clubs" ALTER COLUMN "clubType" TYPE "StudyClubType_new" USING ("clubType"::text::"StudyClubType_new");
ALTER TYPE "StudyClubType" RENAME TO "StudyClubType_old";
ALTER TYPE "StudyClubType_new" RENAME TO "StudyClubType";
DROP TYPE "StudyClubType_old";
ALTER TABLE "study_clubs" ALTER COLUMN "clubType" SET DEFAULT 'CASUAL_STUDY_GROUP';
COMMIT;

-- AlterTable (Drop privacy column BEFORE dropping enum)
ALTER TABLE "study_clubs" DROP COLUMN "privacy",
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "color" TEXT DEFAULT '#FFA500',
ADD COLUMN     "enableAnalytics" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enableAssignments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enableAttendance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enableAwards" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enableGrading" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enableParentAccess" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enableReports" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enableSubjects" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enableTranscripts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "gradingScale" TEXT,
ADD COLUMN     "language" TEXT DEFAULT 'en',
ADD COLUMN     "level" TEXT,
ADD COLUMN     "mode" "ClubMode" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "objectives" TEXT,
ADD COLUMN     "passingGrade" DOUBLE PRECISION,
ADD COLUMN     "prerequisites" TEXT,
ADD COLUMN     "schoolId" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "subject" TEXT,
ADD COLUMN     "syllabus" TEXT,
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "term" TEXT,
ALTER COLUMN "clubType" SET DEFAULT 'CASUAL_STUDY_GROUP',
ADD CONSTRAINT "study_clubs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropEnum (Now safe after dropping the column)
DROP TYPE "ClubPrivacy";

-- CreateTable
CREATE TABLE "club_members" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ClubMemberRole" NOT NULL DEFAULT 'STUDENT',
    "studentNumber" TEXT,
    "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "withdrawnAt" TIMESTAMP(3),
    "withdrawalReason" TEXT,
    "invitedBy" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_subjects" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "credits" DOUBLE PRECISION,
    "weeklyHours" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "instructorId" TEXT,
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "passingScore" DOUBLE PRECISION,
    "order" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_grades" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "assessmentType" "AssessmentType" NOT NULL,
    "assessmentName" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION,
    "weightedScore" DOUBLE PRECISION,
    "term" TEXT,
    "gradedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,
    "gradedById" TEXT NOT NULL,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_sessions" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "location" TEXT,
    "meetingUrl" TEXT,
    "topics" TEXT[],
    "materials" TEXT[],
    "attendanceRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_attendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "arrivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "markedById" TEXT,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studyClubId" TEXT,

    CONSTRAINT "club_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_assignments" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "subjectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT,
    "type" "AssessmentType" NOT NULL DEFAULT 'HOMEWORK',
    "maxPoints" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "publishedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "lateDeadline" TIMESTAMP(3),
    "allowLateSubmission" BOOLEAN NOT NULL DEFAULT false,
    "latePenalty" DOUBLE PRECISION,
    "attachments" JSONB,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "autoGrade" BOOLEAN NOT NULL DEFAULT false,
    "requireFile" BOOLEAN NOT NULL DEFAULT true,
    "maxFileSize" INTEGER,
    "allowedFileTypes" TEXT[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_assignment_submissions" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "content" TEXT,
    "attachments" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "score" DOUBLE PRECISION,
    "feedback" TEXT,
    "gradedAt" TIMESTAMP(3),
    "gradedById" TEXT,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "previousSubmissionId" TEXT,

    CONSTRAINT "club_assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_reports" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "term" TEXT,
    "overallGrade" DOUBLE PRECISION,
    "overallPercentage" DOUBLE PRECISION,
    "letterGrade" TEXT,
    "gpa" DOUBLE PRECISION,
    "totalSessions" INTEGER,
    "sessionsPresent" INTEGER,
    "attendanceRate" DOUBLE PRECISION,
    "strengths" TEXT,
    "areasForImprovement" TEXT,
    "teacherComments" TEXT,
    "recommendations" TEXT,
    "pdfUrl" TEXT,
    "generatedById" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_awards" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "AwardType" NOT NULL,
    "description" TEXT,
    "criteria" TEXT,
    "certificateUrl" TEXT,
    "certificateDesign" TEXT,
    "awardedById" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_materials" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "MaterialType" NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "category" TEXT,
    "week" INTEGER,
    "order" INTEGER,
    "tags" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "requiresEnrollment" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_schedules" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "location" TEXT,
    "meetingUrl" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_announcements" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT,
    "targetRoles" "ClubMemberRole"[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "club_members_userId_idx" ON "club_members"("userId");

-- CreateIndex
CREATE INDEX "club_members_clubId_idx" ON "club_members"("clubId");

-- CreateIndex
CREATE INDEX "club_members_clubId_role_idx" ON "club_members"("clubId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "club_members_clubId_userId_key" ON "club_members"("clubId", "userId");

-- CreateIndex
CREATE INDEX "club_subjects_clubId_idx" ON "club_subjects"("clubId");

-- CreateIndex
CREATE INDEX "club_subjects_instructorId_idx" ON "club_subjects"("instructorId");

-- CreateIndex
CREATE UNIQUE INDEX "club_subjects_clubId_code_key" ON "club_subjects"("clubId", "code");

-- CreateIndex
CREATE INDEX "club_grades_clubId_idx" ON "club_grades"("clubId");

-- CreateIndex
CREATE INDEX "club_grades_memberId_idx" ON "club_grades"("memberId");

-- CreateIndex
CREATE INDEX "club_grades_subjectId_idx" ON "club_grades"("subjectId");

-- CreateIndex
CREATE INDEX "club_grades_gradedById_idx" ON "club_grades"("gradedById");

-- CreateIndex
CREATE UNIQUE INDEX "club_grades_memberId_subjectId_assessmentType_assessmentNam_key" ON "club_grades"("memberId", "subjectId", "assessmentType", "assessmentName");

-- CreateIndex
CREATE INDEX "club_sessions_clubId_idx" ON "club_sessions"("clubId");

-- CreateIndex
CREATE INDEX "club_sessions_sessionDate_idx" ON "club_sessions"("sessionDate");

-- CreateIndex
CREATE INDEX "club_sessions_createdById_idx" ON "club_sessions"("createdById");

-- CreateIndex
CREATE INDEX "club_attendance_memberId_idx" ON "club_attendance"("memberId");

-- CreateIndex
CREATE INDEX "club_attendance_sessionId_idx" ON "club_attendance"("sessionId");

-- CreateIndex
CREATE INDEX "club_attendance_markedById_idx" ON "club_attendance"("markedById");

-- CreateIndex
CREATE UNIQUE INDEX "club_attendance_sessionId_memberId_key" ON "club_attendance"("sessionId", "memberId");

-- CreateIndex
CREATE INDEX "club_assignments_clubId_idx" ON "club_assignments"("clubId");

-- CreateIndex
CREATE INDEX "club_assignments_subjectId_idx" ON "club_assignments"("subjectId");

-- CreateIndex
CREATE INDEX "club_assignments_dueDate_idx" ON "club_assignments"("dueDate");

-- CreateIndex
CREATE INDEX "club_assignments_createdById_idx" ON "club_assignments"("createdById");

-- CreateIndex
CREATE INDEX "club_assignment_submissions_memberId_idx" ON "club_assignment_submissions"("memberId");

-- CreateIndex
CREATE INDEX "club_assignment_submissions_assignmentId_idx" ON "club_assignment_submissions"("assignmentId");

-- CreateIndex
CREATE INDEX "club_assignment_submissions_gradedById_idx" ON "club_assignment_submissions"("gradedById");

-- CreateIndex
CREATE UNIQUE INDEX "club_assignment_submissions_assignmentId_memberId_attemptNu_key" ON "club_assignment_submissions"("assignmentId", "memberId", "attemptNumber");

-- CreateIndex
CREATE INDEX "club_reports_clubId_idx" ON "club_reports"("clubId");

-- CreateIndex
CREATE INDEX "club_reports_memberId_idx" ON "club_reports"("memberId");

-- CreateIndex
CREATE INDEX "club_reports_generatedById_idx" ON "club_reports"("generatedById");

-- CreateIndex
CREATE INDEX "club_awards_clubId_idx" ON "club_awards"("clubId");

-- CreateIndex
CREATE INDEX "club_awards_memberId_idx" ON "club_awards"("memberId");

-- CreateIndex
CREATE INDEX "club_awards_awardedById_idx" ON "club_awards"("awardedById");

-- CreateIndex
CREATE INDEX "club_materials_clubId_idx" ON "club_materials"("clubId");

-- CreateIndex
CREATE INDEX "club_materials_category_idx" ON "club_materials"("category");

-- CreateIndex
CREATE INDEX "club_materials_uploadedById_idx" ON "club_materials"("uploadedById");

-- CreateIndex
CREATE INDEX "club_schedules_clubId_idx" ON "club_schedules"("clubId");

-- CreateIndex
CREATE INDEX "club_schedules_dayOfWeek_idx" ON "club_schedules"("dayOfWeek");

-- CreateIndex
CREATE INDEX "club_announcements_clubId_idx" ON "club_announcements"("clubId");

-- CreateIndex
CREATE INDEX "club_announcements_createdAt_idx" ON "club_announcements"("createdAt");

-- CreateIndex
CREATE INDEX "club_announcements_createdById_idx" ON "club_announcements"("createdById");

-- CreateIndex
CREATE INDEX "study_clubs_mode_idx" ON "study_clubs"("mode");

-- CreateIndex
CREATE INDEX "study_clubs_isActive_idx" ON "study_clubs"("isActive");

-- AddForeignKey
ALTER TABLE "study_clubs" ADD CONSTRAINT "study_clubs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "study_clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_subjects" ADD CONSTRAINT "club_subjects_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "study_clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_subjects" ADD CONSTRAINT "club_subjects_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_grades" ADD CONSTRAINT "club_grades_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "study_clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_grades" ADD CONSTRAINT "club_grades_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "club_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_grades" ADD CONSTRAINT "club_grades_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "club_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_grades" ADD CONSTRAINT "club_grades_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_sessions" ADD CONSTRAINT "club_sessions_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "study_clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_sessions" ADD CONSTRAINT "club_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_attendance" ADD CONSTRAINT "club_attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "club_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_attendance" ADD CONSTRAINT "club_attendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "club_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_attendance" ADD CONSTRAINT "club_attendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_attendance" ADD CONSTRAINT "club_attendance_studyClubId_fkey" FOREIGN KEY ("studyClubId") REFERENCES "study_clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_assignments" ADD CONSTRAINT "club_assignments_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "study_clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_assignments" ADD CONSTRAINT "club_assignments_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "club_subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_assignments" ADD CONSTRAINT "club_assignments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_assignment_submissions" ADD CONSTRAINT "club_assignment_submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "club_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_assignment_submissions" ADD CONSTRAINT "club_assignment_submissions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "club_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_assignment_submissions" ADD CONSTRAINT "club_assignment_submissions_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_assignment_submissions" ADD CONSTRAINT "club_assignment_submissions_previousSubmissionId_fkey" FOREIGN KEY ("previousSubmissionId") REFERENCES "club_assignment_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_reports" ADD CONSTRAINT "club_reports_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "study_clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_reports" ADD CONSTRAINT "club_reports_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "club_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_reports" ADD CONSTRAINT "club_reports_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_awards" ADD CONSTRAINT "club_awards_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "study_clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_awards" ADD CONSTRAINT "club_awards_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "club_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_awards" ADD CONSTRAINT "club_awards_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_materials" ADD CONSTRAINT "club_materials_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "study_clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_materials" ADD CONSTRAINT "club_materials_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_schedules" ADD CONSTRAINT "club_schedules_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "study_clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_announcements" ADD CONSTRAINT "club_announcements_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "study_clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_announcements" ADD CONSTRAINT "club_announcements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
