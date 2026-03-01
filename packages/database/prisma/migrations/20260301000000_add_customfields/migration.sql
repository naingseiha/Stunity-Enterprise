-- Migration: add_customFields_to_student_teacher_parent_subject
-- Generated: 2026-03-01
-- 
-- Adds flexible JSON column to store country/school-specific data
-- without requiring schema changes for each new country.
--
-- SAFE TO APPLY: additive-only, no data is modified or dropped.
-- Apply with: psql $DATABASE_URL -f this_file.sql
--         or: npx prisma db execute --file this_file.sql

-- AlterTable
ALTER TABLE "parents" ADD COLUMN IF NOT EXISTS "customFields" JSONB;

-- AlterTable
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "customFields" JSONB;

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "customFields" JSONB;

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "customFields" JSONB;
