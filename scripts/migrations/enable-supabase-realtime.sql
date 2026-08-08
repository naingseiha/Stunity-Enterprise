-- =============================================================================
-- Supabase Realtime Setup — Full Configuration
-- =============================================================================
-- Run this in Supabase Dashboard → SQL Editor after any fresh database reset,
-- or whenever Realtime stops working (e.g. after enabling security features).
--
-- Security architecture:
--   Application authorization is owned by the backend. Anonymous Supabase
--   clients must never receive raw table rows or WAL changes. RLS therefore
--   remains enabled and anon SELECT is explicitly revoked. Realtime consumers
--   must use an authenticated Supabase-compatible JWT with least-privilege RLS
--   policies, or receive authorized events through the backend.
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

-- ─── Step 2: Keep RLS enabled on every published table ───────────────────────

ALTER TABLE public.posts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_conversations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_clubs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members       ENABLE ROW LEVEL SECURITY;

-- ─── Step 3: Set REPLICA IDENTITY FULL ───────────────────────────────────────
-- Required so that UPDATE events (likes count, comments count) include the
-- full row in the payload, not just the changed columns.

ALTER TABLE public.posts     REPLICA IDENTITY FULL;
ALTER TABLE public.comments  REPLICA IDENTITY FULL;
ALTER TABLE public.likes     REPLICA IDENTITY FULL;

-- ─── Step 4: Deny anonymous table reads ──────────────────────────────────────
-- An anon publishable key is public by design. It must not grant table access.

REVOKE SELECT ON public.posts               FROM anon;
REVOKE SELECT ON public.comments            FROM anon;
REVOKE SELECT ON public.likes               FROM anon;
REVOKE SELECT ON public.notifications       FROM anon;
REVOKE SELECT ON public.direct_messages     FROM anon;
REVOKE SELECT ON public.dm_conversations    FROM anon;
REVOKE SELECT ON public.study_clubs         FROM anon;
REVOKE SELECT ON public.club_members        FROM anon;

-- ─── Verification ────────────────────────────────────────────────────────────
-- Run these to confirm everything is set correctly:

-- SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('posts','comments','likes');
-- SELECT relname, CASE relreplident WHEN 'f' THEN 'FULL' WHEN 'd' THEN 'DEFAULT' END as replica_identity
--   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'public' AND relname IN ('posts','comments','likes');
-- SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants
--   WHERE table_schema = 'public' AND table_name = 'posts' AND grantee = 'anon';
-- Expected result: no SELECT row for anon.
