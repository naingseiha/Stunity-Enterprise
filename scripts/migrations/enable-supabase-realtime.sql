-- =============================================================================
-- Supabase Realtime Setup — Full Configuration
-- =============================================================================
-- Run this in Supabase Dashboard → SQL Editor after any fresh database reset,
-- or whenever Realtime stops working (e.g. after enabling security features).
--
-- Architecture note:
--   This app uses custom microservice JWTs, NOT Supabase Auth.
--   The Supabase client is permanently anonymous (anon key only).
--   Therefore:
--     1. RLS must be DISABLED on Realtime tables (anon client can't pass RLS checks)
--     2. GRANT SELECT must be given to anon + authenticated roles
--     3. REPLICA IDENTITY FULL must be set for UPDATE events to carry full row data
-- =============================================================================

-- ─── Step 1: Add tables to the Realtime publication ──────────────────────────
-- (Skip any line that errors with "already member of publication")

ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_clubs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.club_members;

-- ─── Step 2: Disable RLS on Realtime tables ──────────────────────────────────
-- Data security is enforced by the backend microservices (JWT middleware),
-- NOT by Supabase RLS. Keeping RLS enabled silently blocks Realtime events
-- for anonymous Supabase clients.

ALTER TABLE public.posts     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes     DISABLE ROW LEVEL SECURITY;

-- ─── Step 3: Set REPLICA IDENTITY FULL ───────────────────────────────────────
-- Required so that UPDATE events (likes count, comments count) include the
-- full row in the payload, not just the changed columns.

ALTER TABLE public.posts     REPLICA IDENTITY FULL;
ALTER TABLE public.comments  REPLICA IDENTITY FULL;
ALTER TABLE public.likes     REPLICA IDENTITY FULL;

-- ─── Step 4: Grant SELECT to anon + authenticated roles ──────────────────────
-- ⚠️  THIS IS THE MOST CRITICAL STEP ⚠️
-- Supabase Realtime uses the 'anon' Postgres role internally to read row data
-- from the WAL before forwarding events to clients. Without GRANT SELECT, the
-- subscription shows SUBSCRIBED but delivers ZERO events — a completely silent
-- failure with no error message.

GRANT SELECT ON public.posts          TO anon, authenticated;
GRANT SELECT ON public.comments       TO anon, authenticated;
GRANT SELECT ON public.likes          TO anon, authenticated;
GRANT SELECT ON public.notifications  TO anon, authenticated;
GRANT SELECT ON public.direct_messages TO anon, authenticated;
GRANT SELECT ON public.dm_conversations TO anon, authenticated;
GRANT SELECT ON public.study_clubs    TO anon, authenticated;
GRANT SELECT ON public.club_members   TO anon, authenticated;

-- ─── Verification ────────────────────────────────────────────────────────────
-- Run these to confirm everything is set correctly:

-- SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('posts','comments','likes');
-- SELECT relname, CASE relreplident WHEN 'f' THEN 'FULL' WHEN 'd' THEN 'DEFAULT' END as replica_identity
--   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'public' AND relname IN ('posts','comments','likes');
-- SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants
--   WHERE table_schema = 'public' AND table_name = 'posts' AND grantee IN ('anon','authenticated');
