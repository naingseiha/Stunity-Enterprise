-- Surgical migration: add Ed-Score denormalization fields to posts.
--
-- Hand-written for the same reason as add_recall_cards — pre-existing
-- schema drift on school_profiles + production indexes blocks
-- `prisma migrate dev`. This migration adds only the new posts columns,
-- the edScore-sort index, and the verifier FK. No drift is touched.
--
-- Applied via:  cd packages/database && npx prisma db execute \
--                 --file prisma/migrations/<name>/migration.sql \
--                 --schema prisma/schema.prisma
-- Marked done:  npx prisma migrate resolve --applied <name> \
--                 --schema prisma/schema.prisma

-- AlterTable: add Ed-Score denormalization fields
ALTER TABLE "posts"
  ADD COLUMN "edScore" DOUBLE PRECISION,
  ADD COLUMN "edScoreCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "teacherVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "verifiedByTeacherId" TEXT,
  ADD COLUMN "verifiedAt" TIMESTAMP(3);

-- CreateIndex: powers Brain Mode server-side sort (when /feed/brain ships)
-- and any "top-rated this week" surfaces. DESC NULLS LAST is implicit on
-- Postgres for DESC, so unrated posts naturally fall to the end.
CREATE INDEX "posts_edScore_createdAt_idx" ON "posts"("edScore" DESC, "createdAt" DESC);

-- AddForeignKey: optional verifier link (set null on user delete so the
-- post stays verified even if the teacher account is gone).
ALTER TABLE "posts"
  ADD CONSTRAINT "posts_verifiedByTeacherId_fkey"
  FOREIGN KEY ("verifiedByTeacherId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
