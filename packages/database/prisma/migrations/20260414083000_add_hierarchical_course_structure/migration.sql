-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CourseItemType" AS ENUM ('VIDEO', 'ARTICLE', 'QUIZ', 'ASSIGNMENT');

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "sectionId" TEXT,
ADD COLUMN     "type" "CourseItemType" NOT NULL DEFAULT 'VIDEO';

-- CreateTable
CREATE TABLE "course_sections" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_qa_threads" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "itemId" TEXT,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_qa_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_qa_answers" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isInstructor" BOOLEAN NOT NULL DEFAULT false,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_qa_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_announcements" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_notes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_sections_courseId_idx" ON "course_sections"("courseId");

-- CreateIndex
CREATE INDEX "course_qa_threads_courseId_idx" ON "course_qa_threads"("courseId");

-- CreateIndex
CREATE INDEX "course_qa_answers_threadId_idx" ON "course_qa_answers"("threadId");

-- CreateIndex
CREATE INDEX "course_announcements_courseId_idx" ON "course_announcements"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "course_notes_userId_lessonId_key" ON "course_notes"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "courses_status_idx" ON "courses"("status");

-- CreateIndex
CREATE INDEX "lessons_sectionId_idx" ON "lessons"("sectionId");

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "course_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_sections" ADD CONSTRAINT "course_sections_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_qa_threads" ADD CONSTRAINT "course_qa_threads_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_qa_answers" ADD CONSTRAINT "course_qa_answers_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "course_qa_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_announcements" ADD CONSTRAINT "course_announcements_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_notes" ADD CONSTRAINT "course_notes_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

