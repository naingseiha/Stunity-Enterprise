-- ============================================================
-- Migration: add_education_model
-- Date: 2026-04-14
-- Safety: all operations are non-destructive
--   - CREATE TYPE adds a new enum (no existing data affected)
--   - ALTER TABLE ADD COLUMN with DEFAULT values (no locking, no data loss)
--   - UPDATE backfill is idempotent and scoped to existing KH / NULL schools
-- ============================================================

-- Step 1: Create the EducationModel enum type
CREATE TYPE "EducationModel" AS ENUM (
  'KHM_MOEYS',
  'EU_STANDARD',
  'INT_BACC',
  'CUSTOM'
);

-- Step 2: Add nullable educationModel column with safe default
ALTER TABLE "schools"
  ADD COLUMN "educationModel" "EducationModel" DEFAULT 'KHM_MOEYS';

-- Step 3: Add nullable defaultLanguage column with safe default
ALTER TABLE "schools"
  ADD COLUMN "defaultLanguage" TEXT DEFAULT 'km-KH';

-- Step 4: Backfill existing schools
-- All schools currently in the DB are Cambodian (countryCode = 'KH' or NULL).
-- Set them to KHM_MOEYS + km-KH.  Safe to run twice (idempotent).
UPDATE "schools"
SET
  "educationModel" = 'KHM_MOEYS',
  "defaultLanguage" = 'km-KH'
WHERE
  "countryCode" = 'KH'
  OR "countryCode" IS NULL;
