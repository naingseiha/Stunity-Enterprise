-- Emergency hardening for databases that previously ran
-- enable-supabase-realtime.sql with anonymous SELECT access.
--
-- This intentionally stops anonymous postgres_changes delivery. Apply before
-- introducing authenticated Realtime policies or a backend event channel.

BEGIN;

ALTER TABLE public.posts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_conversations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_clubs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members       ENABLE ROW LEVEL SECURITY;

REVOKE SELECT ON public.posts               FROM anon;
REVOKE SELECT ON public.comments            FROM anon;
REVOKE SELECT ON public.likes               FROM anon;
REVOKE SELECT ON public.notifications       FROM anon;
REVOKE SELECT ON public.direct_messages     FROM anon;
REVOKE SELECT ON public.dm_conversations    FROM anon;
REVOKE SELECT ON public.study_clubs         FROM anon;
REVOKE SELECT ON public.club_members        FROM anon;

COMMIT;

-- Verification: all rows should show rowsecurity=true and the grant query
-- should return no SELECT privileges for anon.
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'posts', 'comments', 'likes', 'notifications', 'direct_messages',
    'dm_conversations', 'study_clubs', 'club_members'
  )
ORDER BY tablename;

SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee = 'anon'
  AND privilege_type = 'SELECT'
  AND table_name IN (
    'posts', 'comments', 'likes', 'notifications', 'direct_messages',
    'dm_conversations', 'study_clubs', 'club_members'
  );
