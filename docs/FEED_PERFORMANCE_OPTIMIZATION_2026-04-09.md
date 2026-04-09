# Feed Performance Optimization Summary

Date: 2026-04-09

This document summarizes the web and feed-service performance work completed for the Stunity news feed, plus the follow-up fixes required to keep the optimized code compatible with the current production/local database state.

## Goals

- Improve perceived route-change speed from the web feed to other screens.
- Reduce browser cost for long scrolling sessions on the web feed.
- Make feed pagination stable and scalable for very large datasets.
- Reduce backend query cost on `/posts` and `/posts/feed`.
- Keep feed ranking, suggestions, and real-time behavior unchanged.
- Avoid any design changes.

## Web Changes

### Faster route transitions

The web app now leaves the feed screen faster by removing avoidable wait states and adding route-level loading boundaries.

Updated:

- `apps/web/src/app/[locale]/feed/page.tsx`
- `apps/web/src/components/feed/PostCard.tsx`
- `apps/web/src/app/[locale]/profile/[userId]/page.tsx`
- `apps/web/src/app/[locale]/clubs/[id]/page.tsx`
- `apps/web/src/app/[locale]/learn/course/[id]/page.tsx`
- `apps/web/src/app/[locale]/learn/course/[id]/lesson/[lessonId]/page.tsx`

Added route loading files:

- `apps/web/src/app/[locale]/profile/[userId]/loading.tsx`
- `apps/web/src/app/[locale]/clubs/loading.tsx`
- `apps/web/src/app/[locale]/clubs/[id]/loading.tsx`
- `apps/web/src/app/[locale]/events/loading.tsx`
- `apps/web/src/app/[locale]/learn/loading.tsx`
- `apps/web/src/app/[locale]/learn/course/[id]/loading.tsx`
- `apps/web/src/app/[locale]/learn/course/[id]/lesson/[lessonId]/loading.tsx`

### Route data warming and cache reuse

Common destinations from the feed now warm route bundles and recent route data so revisits feel faster without changing the UI.

Updated:

- `apps/web/src/app/[locale]/clubs/page.tsx`
- `apps/web/src/app/[locale]/events/page.tsx`
- `apps/web/src/app/[locale]/learn/page.tsx`
- `apps/web/src/app/[locale]/profile/[userId]/page.tsx`

Added:

- `apps/web/src/lib/route-data-cache.ts`

### Feed virtualization

The web feed now virtualizes long scrolling sessions so the browser does not keep every historical feed card mounted in the DOM.

Updated:

- `apps/web/src/app/[locale]/feed/page.tsx`

## Feed-Service Changes

### Stable pagination and lighter `/posts`

The plain feed route now uses deterministic ordering and cursor support, with a lightweight first query followed by targeted hydration.

Updated:

- `services/feed-service/src/routes/posts.routes.ts`
- `services/feed-service/src/utils/feedCursor.ts`

Key changes:

- Stable ordering by `isPinned DESC, createdAt DESC, id DESC`
- Opaque cursor support for `/posts`
- `limit + 1` probing for `hasMore`
- Lightweight page-row query before full post hydration
- Response compatibility preserved for current feed clients

### Personalized feed cursor support

The personalized `/posts/feed` route now supports cursor-aware recent feed pagination while preserving `FOR_YOU`, `FOLLOWING`, recommendations, and real-time behavior.

Updated:

- `services/feed-service/src/feedRanker.ts`
- `services/feed-service/src/routes/posts.routes.ts`

### Visibility scope optimization

Feed visibility resolution now uses a cached, pre-resolved scope for hot read paths.

Updated:

- `services/feed-service/src/utils/visibilityScope.ts`
- `services/feed-service/src/redis.ts`

Key changes:

- Cached user visibility scope in Redis/in-memory fallback
- Pre-resolved class-visible author IDs
- Safe fallback to `author.schoolId` for school visibility until all environments have the denormalized post column

### Denormalized school scope for posts

To support faster school-scope feed reads, a denormalized `Post.schoolId` field and supporting index were added.

Updated:

- `packages/database/prisma/schema.prisma`
- `services/feed-service/src/routes/postActions.routes.ts`
- `services/feed-service/src/clubs.ts`
- `services/feed-service/src/calendar.ts`

Added migrations:

- `packages/database/prisma/migrations/20260409174000_optimize_post_feed_indexes/migration.sql`
- `packages/database/prisma/migrations/20260409183500_denormalize_post_school_scope/migration.sql`

### Startup resilience

Background jobs were hardened so temporary database issues during startup do not kill the whole feed or analytics service.

Updated:

- `services/feed-service/src/gamificationJobs.ts`
- `services/analytics-service/src/index.ts`

## Compatibility Fixes After Rollout

While rolling out the performance changes, the local database was still missing the new `posts.schoolId` column. That caused:

- `/posts` failures during feed hydration
- `/posts/feed` failures in personalized ranking paths
- background score refresh failures

Compatibility fixes were added so the optimized code can still run safely:

- `/posts` hydration now explicitly selects only required pre-existing fields
- `refreshPostScores()` now selects only the columns it actually needs
- school visibility reads temporarily fall back to `author.schoolId` when needed

Once all environments have the migration applied, those compatibility safeguards can remain in place or be simplified later.

## Verified Results

Verified during implementation:

- `npm run build --workspace @stunity/web`
- `npm run build --workspace feed-service`
- `npm run build --workspace auth-service`
- direct runtime verification of:
  - `GET /health` on `3010`
  - `GET /posts`
  - `GET /posts/feed`

Final runtime state after fixes:

- web feed loads again
- personalized mobile feed loads again
- route transitions remain optimized
- feed ranking logic remains intact
- no design changes were introduced

## Important Notes

- The optimization work is complete.
- The latest fixes were compatibility and rollout fixes, not reversions of the speed work.
- The personalized feed algorithm, suggestions, and real-time updates were intentionally left unchanged.
