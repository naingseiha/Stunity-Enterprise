-- Schema reconciliation surgical fixes — applied via prisma db execute.
-- Each statement is idempotent or guarded so re-running is safe.

-- 1) Drop unused DB-side defaults (Prisma sets these values at the client
--    layer, so the DB defaults never fire and shouldn't be there).

ALTER TABLE "grade_confirmations" ALTER COLUMN "confirmedAt" DROP DEFAULT;

ALTER TABLE "user_post_feedback" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "user_post_feedback" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- 2) Add missing FK that schema declares but DB doesn't have.

ALTER TABLE "grade_confirmations"
  ADD CONSTRAINT "grade_confirmations_confirmedBy_fkey"
  FOREIGN KEY ("confirmedBy") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 3) Add missing perf index that schema declares but DB doesn't have.

CREATE INDEX IF NOT EXISTS "profile_views_profile_viewer_viewed_idx"
  ON "profile_views" ("profileUserId", "viewerId", "viewedAt" DESC);

-- 4) Fix fk_school: DB constraint lacks ON UPDATE CASCADE, schema declares
--    Prisma's default (CASCADE on update). Drop + recreate with both
--    behaviors so the constraint name (`fk_school`) is preserved.

ALTER TABLE "school_profiles" DROP CONSTRAINT "fk_school";
ALTER TABLE "school_profiles"
  ADD CONSTRAINT "fk_school"
  FOREIGN KEY ("schoolId") REFERENCES "schools"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
