# Messaging (archived)

Direct messaging UI and Supabase Realtime subscriptions are **disabled** via `FEATURE_FLAGS.MESSAGING_ENABLED` in `apps/mobile/src/config/featureFlags.ts`.

## Why archived

- Reduces Supabase Realtime and API load on the current Pro plan.
- Full messaging is planned for **Enterprise** (messaging-service + filtered Realtime).

## Re-enable later

1. Set `MESSAGING_ENABLED: true` in `featureFlags.ts`.
2. Confirm `scripts/migrations/enable-supabase-realtime.sql` publishes `messages` / `conversations` (or `direct_messages` / `dm_conversations` per your schema).
3. Restore message buttons in `ProfileScreen`, `ClassDetailsScreen`, and `ClassMembersScreen` (search `FEATURE_FLAGS.MESSAGING_ENABLED`).
4. Verify `MainNavigator` still registers the `Messages` stack.

## Code locations

- Screens: `apps/mobile/src/screens/messages/`
- Store: `apps/mobile/src/stores/messagingStore.ts`
- Backend: `services/feed-service/src/dm.ts`, `services/messaging-service/`
