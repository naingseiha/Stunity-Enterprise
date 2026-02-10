/*
  Warnings:

  - A unique constraint covering the columns `[permanentId]` on the table `students` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[permanentId]` on the table `teachers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[emailVerificationToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "GradeLevel" AS ENUM ('PRIMARY', 'SECONDARY', 'HIGH_SCHOOL');

-- CreateEnum
CREATE TYPE "TimetablePublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('TEACHER', 'PARENT');

-- CreateEnum
CREATE TYPE "DMMessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'VOICE', 'VIDEO', 'STICKER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "StudyClubType" AS ENUM ('SUBJECT', 'SKILL', 'RESEARCH', 'PROJECT', 'EXAM_PREP', 'LANGUAGE', 'COMPETITION', 'TUTORING');

-- CreateEnum
CREATE TYPE "ClubPrivacy" AS ENUM ('PUBLIC', 'SCHOOL', 'PRIVATE', 'SECRET');

-- CreateEnum
CREATE TYPE "ClubMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('GENERAL', 'ACADEMIC', 'SPORTS', 'CULTURAL', 'CLUB', 'WORKSHOP', 'MEETING', 'HOLIDAY', 'DEADLINE', 'COMPETITION');

-- CreateEnum
CREATE TYPE "EventPrivacy" AS ENUM ('PUBLIC', 'SCHOOL', 'CLUB', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "RSVPStatus" AS ENUM ('PENDING', 'GOING', 'MAYBE', 'NOT_GOING');

-- CreateEnum
CREATE TYPE "CourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('FILE', 'LINK', 'PDF', 'VIDEO', 'AUDIO');

-- CreateEnum
CREATE TYPE "StoryType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "IdFormat" AS ENUM ('STRUCTURED', 'SIMPLIFIED', 'HYBRID');

-- CreateEnum
CREATE TYPE "ClaimCodeType" AS ENUM ('STUDENT', 'TEACHER', 'STAFF', 'PARENT');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('SOCIAL_ONLY', 'SCHOOL_ONLY', 'HYBRID');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PostType" ADD VALUE 'CLUB_CREATED';
ALTER TYPE "PostType" ADD VALUE 'EVENT_CREATED';

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "mediaDisplayMode" TEXT DEFAULT 'AUTO',
ADD COLUMN     "studyClubId" TEXT;

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "countryCode" TEXT DEFAULT 'KH',
ADD COLUMN     "idFormat" "IdFormat" NOT NULL DEFAULT 'STRUCTURED',
ADD COLUMN     "idPrefix" TEXT DEFAULT '01',
ADD COLUMN     "nextStudentNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "nextTeacherNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "regionCode" TEXT;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "entryYear" INTEGER,
ADD COLUMN     "permanentId" TEXT,
ADD COLUMN     "studentIdFormat" "IdFormat",
ADD COLUMN     "studentIdMeta" JSONB;

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "hireYear" INTEGER,
ADD COLUMN     "permanentId" TEXT,
ADD COLUMN     "teacherIdFormat" "IdFormat",
ADD COLUMN     "teacherIdMeta" JSONB;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accountType" "AccountType" NOT NULL DEFAULT 'SOCIAL_ONLY',
ADD COLUMN     "emailVerificationExpiry" TIMESTAMP(3),
ADD COLUMN     "emailVerificationToken" TEXT,
ADD COLUMN     "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "organizationCode" TEXT,
ADD COLUMN     "organizationName" TEXT,
ADD COLUMN     "organizationType" TEXT,
ADD COLUMN     "privacySettings" JSONB,
ADD COLUMN     "socialFeaturesEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ssoAccessToken" TEXT,
ADD COLUMN     "ssoId" TEXT,
ADD COLUMN     "ssoProvider" TEXT;

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "degree" TEXT,
    "fieldOfStudy" TEXT,
    "grade" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "activities" TEXT[],
    "skills" TEXT[],
    "mediaUrls" TEXT[],
    "mediaKeys" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periods" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isBreak" BOOLEAN NOT NULL DEFAULT false,
    "duration" INTEGER NOT NULL DEFAULT 45,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_entries" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT,
    "teacherId" TEXT,
    "periodId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "room" TEXT,
    "academicYearId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_shifts" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKh" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "gradeLevel" "GradeLevel",
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_shifts" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_shift_overrides" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "shiftId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_shift_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_subject_assignments" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "maxPeriodsPerWeek" INTEGER NOT NULL DEFAULT 25,
    "preferredGrades" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_subject_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "ClaimCodeType" NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT,
    "teacherId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "claimedByUserId" TEXT,
    "verificationData" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokedReason" TEXT,

    CONSTRAINT "claim_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "id_generation_logs" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "generatedId" TEXT NOT NULL,
    "format" "IdFormat" NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "id_generation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_templates" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "gradeLevel" "GradeLevel",
    "periodsPerWeek" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_publishes" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedBy" TEXT NOT NULL,
    "status" "TimetablePublishStatus" NOT NULL DEFAULT 'DRAFT',
    "notifyTeachers" BOOLEAN NOT NULL DEFAULT false,
    "notifyClasses" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_publishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" "SenderType" NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dm_conversations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessage" TEXT,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "groupName" TEXT,
    "groupAvatar" TEXT,

    CONSTRAINT "dm_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dm_participants" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "mutedUntil" TIMESTAMP(3),
    "lastReadAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "dm_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" "DMMessageType" NOT NULL DEFAULT 'TEXT',
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "replyToId" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dm_read_receipts" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dm_read_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_clubs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "clubType" "StudyClubType" NOT NULL DEFAULT 'SUBJECT',
    "category" TEXT,
    "privacy" "ClubPrivacy" NOT NULL DEFAULT 'PUBLIC',
    "coverImage" TEXT,
    "creatorId" TEXT NOT NULL,
    "schoolId" TEXT,
    "maxMembers" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_club_members" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ClubMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedBy" TEXT,

    CONSTRAINT "study_club_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "virtualLink" TEXT,
    "coverImage" TEXT,
    "eventType" "CalendarEventType" NOT NULL DEFAULT 'GENERAL',
    "privacy" "EventPrivacy" NOT NULL DEFAULT 'PUBLIC',
    "maxAttendees" INTEGER,
    "creatorId" TEXT NOT NULL,
    "schoolId" TEXT,
    "studyClubId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attendees" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RSVPStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "thumbnail" TEXT,
    "category" TEXT NOT NULL,
    "level" "CourseLevel" NOT NULL DEFAULT 'BEGINNER',
    "duration" INTEGER NOT NULL DEFAULT 0,
    "lessonsCount" INTEGER NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "instructorId" TEXT NOT NULL,
    "tags" TEXT[],
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "enrolledCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "videoUrl" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_resources" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL DEFAULT 'FILE',
    "url" TEXT NOT NULL,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "certificateUrl" TEXT,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "watchTime" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isHelpful" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_paths" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "thumbnail" TEXT,
    "level" TEXT NOT NULL DEFAULT 'BEGINNER',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "creatorId" TEXT NOT NULL,
    "totalDuration" INTEGER NOT NULL DEFAULT 0,
    "coursesCount" INTEGER NOT NULL DEFAULT 0,
    "enrolledCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_path_courses" (
    "id" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "learning_path_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "path_enrollments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "path_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "StoryType" NOT NULL DEFAULT 'TEXT',
    "mediaUrl" TEXT,
    "thumbnailUrl" TEXT,
    "text" TEXT,
    "backgroundColor" TEXT,
    "textColor" TEXT,
    "fontStyle" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 5,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_views" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_reactions" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookmarks_userId_idx" ON "bookmarks"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_postId_userId_key" ON "bookmarks"("postId", "userId");

-- CreateIndex
CREATE INDEX "education_userId_startDate_idx" ON "education"("userId", "startDate" DESC);

-- CreateIndex
CREATE INDEX "periods_schoolId_idx" ON "periods"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "periods_schoolId_order_key" ON "periods"("schoolId", "order");

-- CreateIndex
CREATE INDEX "timetable_entries_schoolId_idx" ON "timetable_entries"("schoolId");

-- CreateIndex
CREATE INDEX "timetable_entries_classId_idx" ON "timetable_entries"("classId");

-- CreateIndex
CREATE INDEX "timetable_entries_teacherId_idx" ON "timetable_entries"("teacherId");

-- CreateIndex
CREATE INDEX "timetable_entries_periodId_idx" ON "timetable_entries"("periodId");

-- CreateIndex
CREATE INDEX "timetable_entries_academicYearId_idx" ON "timetable_entries"("academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_entries_classId_periodId_dayOfWeek_academicYearId_key" ON "timetable_entries"("classId", "periodId", "dayOfWeek", "academicYearId");

-- CreateIndex
CREATE INDEX "school_shifts_schoolId_idx" ON "school_shifts"("schoolId");

-- CreateIndex
CREATE INDEX "school_shifts_gradeLevel_idx" ON "school_shifts"("gradeLevel");

-- CreateIndex
CREATE UNIQUE INDEX "school_shifts_schoolId_name_key" ON "school_shifts"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "class_shifts_classId_key" ON "class_shifts"("classId");

-- CreateIndex
CREATE INDEX "class_shifts_shiftId_idx" ON "class_shifts"("shiftId");

-- CreateIndex
CREATE INDEX "class_shift_overrides_shiftId_idx" ON "class_shift_overrides"("shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "class_shift_overrides_classId_dayOfWeek_key" ON "class_shift_overrides"("classId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "teacher_subject_assignments_teacherId_idx" ON "teacher_subject_assignments"("teacherId");

-- CreateIndex
CREATE INDEX "teacher_subject_assignments_subjectId_idx" ON "teacher_subject_assignments"("subjectId");

-- CreateIndex
CREATE INDEX "teacher_subject_assignments_isPrimary_idx" ON "teacher_subject_assignments"("isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_subject_assignments_teacherId_subjectId_key" ON "teacher_subject_assignments"("teacherId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "claim_codes_code_key" ON "claim_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "claim_codes_studentId_key" ON "claim_codes"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "claim_codes_teacherId_key" ON "claim_codes"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "claim_codes_claimedByUserId_key" ON "claim_codes"("claimedByUserId");

-- CreateIndex
CREATE INDEX "claim_codes_code_idx" ON "claim_codes"("code");

-- CreateIndex
CREATE INDEX "claim_codes_schoolId_idx" ON "claim_codes"("schoolId");

-- CreateIndex
CREATE INDEX "claim_codes_studentId_idx" ON "claim_codes"("studentId");

-- CreateIndex
CREATE INDEX "claim_codes_teacherId_idx" ON "claim_codes"("teacherId");

-- CreateIndex
CREATE INDEX "claim_codes_type_idx" ON "claim_codes"("type");

-- CreateIndex
CREATE INDEX "claim_codes_isActive_idx" ON "claim_codes"("isActive");

-- CreateIndex
CREATE INDEX "claim_codes_expiresAt_idx" ON "claim_codes"("expiresAt");

-- CreateIndex
CREATE INDEX "id_generation_logs_schoolId_entityType_idx" ON "id_generation_logs"("schoolId", "entityType");

-- CreateIndex
CREATE INDEX "id_generation_logs_entityId_idx" ON "id_generation_logs"("entityId");

-- CreateIndex
CREATE INDEX "id_generation_logs_generatedId_idx" ON "id_generation_logs"("generatedId");

-- CreateIndex
CREATE INDEX "id_generation_logs_createdAt_idx" ON "id_generation_logs"("createdAt");

-- CreateIndex
CREATE INDEX "timetable_templates_schoolId_idx" ON "timetable_templates"("schoolId");

-- CreateIndex
CREATE INDEX "timetable_templates_gradeLevel_idx" ON "timetable_templates"("gradeLevel");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_templates_schoolId_name_key" ON "timetable_templates"("schoolId", "name");

-- CreateIndex
CREATE INDEX "timetable_publishes_schoolId_idx" ON "timetable_publishes"("schoolId");

-- CreateIndex
CREATE INDEX "timetable_publishes_academicYearId_idx" ON "timetable_publishes"("academicYearId");

-- CreateIndex
CREATE INDEX "timetable_publishes_status_idx" ON "timetable_publishes"("status");

-- CreateIndex
CREATE INDEX "conversations_teacherId_idx" ON "conversations"("teacherId");

-- CreateIndex
CREATE INDEX "conversations_parentId_idx" ON "conversations"("parentId");

-- CreateIndex
CREATE INDEX "conversations_studentId_idx" ON "conversations"("studentId");

-- CreateIndex
CREATE INDEX "conversations_lastMessageAt_idx" ON "conversations"("lastMessageAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_teacherId_parentId_key" ON "conversations"("teacherId", "parentId");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "messages_isRead_idx" ON "messages"("isRead");

-- CreateIndex
CREATE INDEX "dm_conversations_lastMessageAt_idx" ON "dm_conversations"("lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "dm_participants_userId_leftAt_idx" ON "dm_participants"("userId", "leftAt");

-- CreateIndex
CREATE INDEX "dm_participants_conversationId_idx" ON "dm_participants"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "dm_participants_conversationId_userId_key" ON "dm_participants"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "direct_messages_conversationId_createdAt_idx" ON "direct_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "direct_messages_senderId_idx" ON "direct_messages"("senderId");

-- CreateIndex
CREATE INDEX "direct_messages_replyToId_idx" ON "direct_messages"("replyToId");

-- CreateIndex
CREATE INDEX "dm_read_receipts_messageId_idx" ON "dm_read_receipts"("messageId");

-- CreateIndex
CREATE INDEX "dm_read_receipts_userId_idx" ON "dm_read_receipts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "dm_read_receipts_messageId_userId_key" ON "dm_read_receipts"("messageId", "userId");

-- CreateIndex
CREATE INDEX "study_clubs_creatorId_idx" ON "study_clubs"("creatorId");

-- CreateIndex
CREATE INDEX "study_clubs_clubType_idx" ON "study_clubs"("clubType");

-- CreateIndex
CREATE INDEX "study_clubs_privacy_idx" ON "study_clubs"("privacy");

-- CreateIndex
CREATE INDEX "study_clubs_category_idx" ON "study_clubs"("category");

-- CreateIndex
CREATE INDEX "study_clubs_schoolId_idx" ON "study_clubs"("schoolId");

-- CreateIndex
CREATE INDEX "study_club_members_userId_idx" ON "study_club_members"("userId");

-- CreateIndex
CREATE INDEX "study_club_members_clubId_idx" ON "study_club_members"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "study_club_members_clubId_userId_key" ON "study_club_members"("clubId", "userId");

-- CreateIndex
CREATE INDEX "events_creatorId_idx" ON "events"("creatorId");

-- CreateIndex
CREATE INDEX "events_schoolId_idx" ON "events"("schoolId");

-- CreateIndex
CREATE INDEX "events_studyClubId_idx" ON "events"("studyClubId");

-- CreateIndex
CREATE INDEX "events_startDate_idx" ON "events"("startDate");

-- CreateIndex
CREATE INDEX "events_eventType_idx" ON "events"("eventType");

-- CreateIndex
CREATE INDEX "event_attendees_userId_idx" ON "event_attendees"("userId");

-- CreateIndex
CREATE INDEX "event_attendees_eventId_idx" ON "event_attendees"("eventId");

-- CreateIndex
CREATE INDEX "event_attendees_status_idx" ON "event_attendees"("status");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendees_eventId_userId_key" ON "event_attendees"("eventId", "userId");

-- CreateIndex
CREATE INDEX "courses_category_idx" ON "courses"("category");

-- CreateIndex
CREATE INDEX "courses_level_idx" ON "courses"("level");

-- CreateIndex
CREATE INDEX "courses_isFeatured_idx" ON "courses"("isFeatured");

-- CreateIndex
CREATE INDEX "courses_isPublished_idx" ON "courses"("isPublished");

-- CreateIndex
CREATE INDEX "courses_instructorId_idx" ON "courses"("instructorId");

-- CreateIndex
CREATE INDEX "lessons_courseId_idx" ON "lessons"("courseId");

-- CreateIndex
CREATE INDEX "lessons_order_idx" ON "lessons"("order");

-- CreateIndex
CREATE INDEX "lesson_resources_lessonId_idx" ON "lesson_resources"("lessonId");

-- CreateIndex
CREATE INDEX "enrollments_userId_idx" ON "enrollments"("userId");

-- CreateIndex
CREATE INDEX "enrollments_courseId_idx" ON "enrollments"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_userId_courseId_key" ON "enrollments"("userId", "courseId");

-- CreateIndex
CREATE INDEX "lesson_progress_userId_idx" ON "lesson_progress"("userId");

-- CreateIndex
CREATE INDEX "lesson_progress_lessonId_idx" ON "lesson_progress"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_userId_lessonId_key" ON "lesson_progress"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "course_reviews_courseId_idx" ON "course_reviews"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "course_reviews_userId_courseId_key" ON "course_reviews"("userId", "courseId");

-- CreateIndex
CREATE INDEX "learning_paths_isFeatured_idx" ON "learning_paths"("isFeatured");

-- CreateIndex
CREATE INDEX "learning_paths_isPublished_idx" ON "learning_paths"("isPublished");

-- CreateIndex
CREATE INDEX "learning_path_courses_pathId_idx" ON "learning_path_courses"("pathId");

-- CreateIndex
CREATE UNIQUE INDEX "learning_path_courses_pathId_courseId_key" ON "learning_path_courses"("pathId", "courseId");

-- CreateIndex
CREATE INDEX "path_enrollments_userId_idx" ON "path_enrollments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "path_enrollments_userId_pathId_key" ON "path_enrollments"("userId", "pathId");

-- CreateIndex
CREATE INDEX "stories_authorId_idx" ON "stories"("authorId");

-- CreateIndex
CREATE INDEX "stories_expiresAt_idx" ON "stories"("expiresAt");

-- CreateIndex
CREATE INDEX "stories_isActive_idx" ON "stories"("isActive");

-- CreateIndex
CREATE INDEX "story_views_storyId_idx" ON "story_views"("storyId");

-- CreateIndex
CREATE INDEX "story_views_viewerId_idx" ON "story_views"("viewerId");

-- CreateIndex
CREATE UNIQUE INDEX "story_views_storyId_viewerId_key" ON "story_views"("storyId", "viewerId");

-- CreateIndex
CREATE INDEX "story_reactions_storyId_idx" ON "story_reactions"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "story_reactions_storyId_userId_key" ON "story_reactions"("storyId", "userId");

-- CreateIndex
CREATE INDEX "posts_studyClubId_idx" ON "posts"("studyClubId");

-- CreateIndex
CREATE UNIQUE INDEX "students_permanentId_key" ON "students"("permanentId");

-- CreateIndex
CREATE INDEX "students_permanentId_idx" ON "students"("permanentId");

-- CreateIndex
CREATE INDEX "students_entryYear_idx" ON "students"("entryYear");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_permanentId_key" ON "teachers"("permanentId");

-- CreateIndex
CREATE INDEX "teachers_permanentId_idx" ON "teachers"("permanentId");

-- CreateIndex
CREATE INDEX "teachers_hireYear_idx" ON "teachers"("hireYear");

-- CreateIndex
CREATE UNIQUE INDEX "users_emailVerificationToken_key" ON "users"("emailVerificationToken");

-- CreateIndex
CREATE INDEX "users_ssoProvider_ssoId_idx" ON "users"("ssoProvider", "ssoId");

-- CreateIndex
CREATE INDEX "users_organizationCode_idx" ON "users"("organizationCode");

-- CreateIndex
CREATE INDEX "users_accountType_idx" ON "users"("accountType");

-- CreateIndex
CREATE INDEX "users_isEmailVerified_idx" ON "users"("isEmailVerified");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_studyClubId_fkey" FOREIGN KEY ("studyClubId") REFERENCES "study_clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education" ADD CONSTRAINT "education_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periods" ADD CONSTRAINT "periods_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_shifts" ADD CONSTRAINT "school_shifts_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_shifts" ADD CONSTRAINT "class_shifts_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_shifts" ADD CONSTRAINT "class_shifts_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "school_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_shift_overrides" ADD CONSTRAINT "class_shift_overrides_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_shift_overrides" ADD CONSTRAINT "class_shift_overrides_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "school_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subject_assignments" ADD CONSTRAINT "teacher_subject_assignments_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subject_assignments" ADD CONSTRAINT "teacher_subject_assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_codes" ADD CONSTRAINT "claim_codes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_codes" ADD CONSTRAINT "claim_codes_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_codes" ADD CONSTRAINT "claim_codes_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_codes" ADD CONSTRAINT "claim_codes_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "id_generation_logs" ADD CONSTRAINT "id_generation_logs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dm_participants" ADD CONSTRAINT "dm_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "dm_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dm_participants" ADD CONSTRAINT "dm_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "dm_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "direct_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dm_read_receipts" ADD CONSTRAINT "dm_read_receipts_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "direct_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dm_read_receipts" ADD CONSTRAINT "dm_read_receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_clubs" ADD CONSTRAINT "study_clubs_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_club_members" ADD CONSTRAINT "study_club_members_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "study_clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_club_members" ADD CONSTRAINT "study_club_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_resources" ADD CONSTRAINT "lesson_resources_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_courses" ADD CONSTRAINT "learning_path_courses_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_courses" ADD CONSTRAINT "learning_path_courses_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "path_enrollments" ADD CONSTRAINT "path_enrollments_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_reactions" ADD CONSTRAINT "story_reactions_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
