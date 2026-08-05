-- Speed up student directory ILIKE / fuzzy search (Google-like typo tolerance).
-- pg_trgm is already enabled by the feed search migration.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram GIN indexes: accelerate contains/ILIKE and similarity() matching
CREATE INDEX IF NOT EXISTS "students_first_name_trgm_idx"
  ON "students" USING GIN ("firstName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "students_last_name_trgm_idx"
  ON "students" USING GIN ("lastName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "students_english_first_name_trgm_idx"
  ON "students" USING GIN ("englishFirstName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "students_english_last_name_trgm_idx"
  ON "students" USING GIN ("englishLastName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "students_student_id_trgm_idx"
  ON "students" USING GIN ("studentId" gin_trgm_ops);

-- Align with directory base scope { schoolId, recordStatus } + common filters/sort
CREATE INDEX IF NOT EXISTS "students_school_recordstatus_created_idx"
  ON "students" ("schoolId", "recordStatus", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "students_school_recordstatus_class_idx"
  ON "students" ("schoolId", "recordStatus", "classId");
