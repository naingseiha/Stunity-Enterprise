-- Ensure CourseAssignment supports passing thresholds used by grading logic
ALTER TABLE "course_assignments"
ADD COLUMN IF NOT EXISTS "passingScore" INTEGER NOT NULL DEFAULT 80;

-- Add learner assignment submissions table used by Learn assignment APIs
CREATE TABLE IF NOT EXISTS "assignment_submissions" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "submissionText" TEXT,
    "submissionUrl" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "score" INTEGER,
    "feedback" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gradedAt" TIMESTAMP(3),
    "gradedBy" TEXT,
    CONSTRAINT "assignment_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "assignment_submissions_assignmentId_userId_key"
ON "assignment_submissions"("assignmentId", "userId");

CREATE INDEX IF NOT EXISTS "assignment_submissions_userId_idx"
ON "assignment_submissions"("userId");

CREATE INDEX IF NOT EXISTS "assignment_submissions_courseId_idx"
ON "assignment_submissions"("courseId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'assignment_submissions_assignmentId_fkey'
      AND table_name = 'assignment_submissions'
  ) THEN
    ALTER TABLE "assignment_submissions"
      ADD CONSTRAINT "assignment_submissions_assignmentId_fkey"
      FOREIGN KEY ("assignmentId")
      REFERENCES "course_assignments"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;
