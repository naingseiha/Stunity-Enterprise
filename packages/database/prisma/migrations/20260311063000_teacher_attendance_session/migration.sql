-- Add explicit teacher attendance session support so MORNING and AFTERNOON
-- records are stored based on user action while preserving historical data.
ALTER TABLE "teacher_attendance"
  ADD COLUMN IF NOT EXISTS "session" "AttendanceSession";

UPDATE "teacher_attendance"
SET "session" = CASE
  WHEN EXTRACT(HOUR FROM "timeIn") < 12 THEN 'MORNING'::"AttendanceSession"
  ELSE 'AFTERNOON'::"AttendanceSession"
END
WHERE "session" IS NULL;

ALTER TABLE "teacher_attendance"
  ALTER COLUMN "session" SET NOT NULL,
  ALTER COLUMN "session" SET DEFAULT 'MORNING';

DROP INDEX IF EXISTS "teacher_attendance_teacherId_date_key";
DROP INDEX IF EXISTS "teacher_attendance_teacherId_date_session_key";

CREATE INDEX IF NOT EXISTS "teacher_attendance_teacherId_date_session_idx"
  ON "teacher_attendance"("teacherId", "date", "session");
