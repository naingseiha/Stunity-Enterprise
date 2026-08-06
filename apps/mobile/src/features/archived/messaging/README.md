# Messaging (REST-first restoration)

School messaging UI is enabled through `FEATURE_FLAGS.MESSAGING_ENABLED`.
Private-message Supabase subscriptions remain disabled through
`FEATURE_FLAGS.MESSAGING_REALTIME_ENABLED`; active screens use lifecycle-aware
REST polling instead.

## Why Realtime remains disabled

- Avoids anon Realtime access to private message tables before filtered RLS is ready.
- Keeps Supabase and always-on connection usage low.
- Push/in-app notifications provide background delivery; polling only runs while
  a message screen is focused and the app is active.

## Enable Realtime later

1. Keep `MESSAGING_ENABLED` enabled and set `MESSAGING_REALTIME_ENABLED: true`
   only after the security review.
2. Confirm `scripts/migrations/enable-supabase-realtime.sql` publishes `messages` / `conversations` (or `direct_messages` / `dm_conversations` per your schema).
3. Require participant-filtered RLS policies; do not grant anonymous table-wide reads.
4. Verify delivery, reconnect, duplicate suppression, and polling fallback.

## Code locations

- Screens: `apps/mobile/src/screens/messages/`
- Store: `apps/mobile/src/stores/messagingStore.ts`
- Backend: `services/feed-service/src/dm.ts`, `services/messaging-service/`
