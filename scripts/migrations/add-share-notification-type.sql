-- Production migration: Add SHARE to NotificationType enum
-- Required for repost notifications. Run once on Supabase production via SQL editor.
--
-- Usage:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste and run this script
--   3. Verify: SELECT enum_range(NULL::"NotificationType");
--
-- Note: ALTER TYPE ... ADD VALUE cannot run inside a transaction block in PostgreSQL.
-- Run as a standalone statement.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SHARE';
