# Stunity Enterprise — Feed Performance Handover
**Date:** 2026-05-31 | **Priority:** P0 Production Blocker

---

## The Problem (Exact Symptom)

When scrolling to the bottom of the feed, pages 6-8+ consistently show blank content
and timeout. Pages 1-5 load quickly. Increasing client-side timeouts to 9-12s doesn't
fix it — the backend still times out.

### Log pattern (confirmed production behaviour):
```
Page 1-5:  ✅ GET /posts/feed - 200 (18 items, fast)
Page 6:    ❌ GET /posts/feed - ECONNABORTED (timeout 9000ms exceeded)
           ⏳ Retrying...
           ❌ GET /posts/feed - ECONNABORTED (timeout 9000ms exceeded)
           (blank at bottom for 18+ seconds)
Page 7-8:  Same pattern
```

The fallback `/posts` endpoint also times out — this is not the ranker being slow.
It means **the database connection/query itself is stalling** once the Redis session
cache is exhausted.

---

## Root Cause (Confirmed by Code Analysis)

### Root cause 1: feedRanker session cache miss → full DB regeneration (CRITICAL)

File: `services/feed-service/src/feedRanker.ts` around line 520-560

The feedRanker caches the full feed sequence in Redis under key:
```
feedranker:session:{userId}:v2:{mode}:{subject}:limit:{limit}:exclude:{excludeKey}
```

For page > 1, it tries to read from this cached sequence. When the cache is a **MISS**
(evicted, TTL expired, or new session), it runs the full pipeline:
1. `getUserSignals()` — 3-5 aggregate queries
2. `getCandidates()` — complex WHERE with school/visibility/following filters
3. `scorePost()` × N candidates
4. `applyDiversity()` × N candidates
5. `hydrateVisiblePostRelations()` — fetches likes/bookmarks/polls per user

This full pipeline can take 8-15s against Supabase Sydney from Cambodia.

**Pages 1-5 work because:**
- Page 1 generates AND caches the sequence
- Pages 2-5 hit the cache (fast Redis reads)

**Pages 6+ fail because:**
- The cached sequence only stores enough items for pages 1-5
- Page 6+ triggers ANOTHER full pipeline run to generate more candidates
- That full pipeline times out against cross-region Supabase

### Root cause 2: No connection keepalive on Prisma (MEDIUM)

File: `services/feed-service/src/context.ts`

Prisma (on Cloud Run) opens a new TCP connection to Supabase PgBouncer for each
pool slot. Without keepalive, idle connections close and must be re-established.
On page 6+, if connections are idle, the TCP handshake + TLS + auth adds 200-500ms.

### Root cause 3: `hydrateVisiblePostRelations` runs for every page (MEDIUM)

File: `services/feed-service/src/feedRanker.ts` around line 463

This function runs 1 additional Prisma query to hydrate POLL/QUIZ posts with
relational data. It's acceptable for page 1 but adds latency for every subsequent
page, including the expensive page 6+ re-generation.

### Root cause 4: Cloud Run cold starts (situational)

The backend has `min-instances: 0` (free tier). After idle, it cold-starts in 8-15s.
The first `/posts/feed` request arrives during cold start and times out.

---

## Files to Modify

### Primary (backend performance):
```
services/feed-service/src/feedRanker.ts        CRITICAL — cache + generation
services/feed-service/src/context.ts           MEDIUM   — Prisma keepalive
services/feed-service/src/routes/posts.routes.ts HIGH   — timeout guard + response cache
```

### Secondary (Cloud Run):
```
services/feed-service/Dockerfile or app.yaml   — min-instances, concurrency
```

---

## Concrete Fixes to Implement

### Fix 1: Extend session cache and pre-generate more pages (CRITICAL)

In `feedRanker.ts`, find `FEED_SESSION_CACHE_TTL_SECONDS` and increase it.
Also, when page 1 generates the feed sequence, generate MORE items (e.g. 200 instead
of the current limit) and cache the full sequence, so pages 1-10 all read from cache.

```typescript
// Current behaviour — generates only `limit` items (18) per page
// Each page 6+ triggers a new full generation.

// Target behaviour: on page 1, generate 200 candidates, cache all 200.
// Pages 1-10 slice from the same cached sequence. Zero DB queries for pages 2-10.

// In generateFeed(), when page === 1 and mode !== 'RECENT':
const FULL_GENERATION_SIZE = 200;  // was: limit (18)
// Run pipeline with take: FULL_GENERATION_SIZE
// Cache the full 200-item sequence
// Slice to [0..limit] for page 1 response
```

Find `feedSessionKey` and the nearby `feedCache.set(feedSessionKey, items, ...)` call.
The cache TTL (`FEED_SESSION_CACHE_TTL_SECONDS`) should be at least 5 minutes.

### Fix 2: Add Prisma connection keepalive

In `services/feed-service/src/context.ts`, add datasource configuration:

```typescript
// In the Prisma client initialization:
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error', 'warn'],
});

// Add connection keepalive via URL params in DATABASE_URL environment variable:
// ?keepalives=1&keepalives_idle=60&keepalives_interval=10&keepalives_count=5&connection_limit=10
// This prevents idle connections from being killed by PgBouncer/Supabase
```

Or if using `packages/database/prisma/schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")  // add ?connection_limit=10&pool_timeout=20 to URL
  directUrl = env("DIRECT_URL")
}
```

### Fix 3: Add response-level cache to /posts/feed (HIGH IMPACT)

In `services/feed-service/src/routes/posts.routes.ts`, the current code caches the
feed response at line ~607 with key `${userId}:${mode}:${page}:...`.

Ensure the cache TTL is high enough (current check: what is `FEED_RESPONSE_CACHE_TTL_SECONDS`?).
For pages > 1, increase TTL to 5 minutes since paginated content is less time-sensitive.

### Fix 4: Background prefetch (HIGHEST IMPACT UX FIX)

After serving page N successfully, immediately trigger an async prefetch of page N+1
and store it in the response cache. The user will never see page N+1 blank because
it's already in cache before they scroll there.

In `feedRanker.ts` or `posts.routes.ts`:
```typescript
// After serving page N response:
if (page >= 1) {
  setImmediate(async () => {
    try {
      const nextPageCacheKey = buildCacheKey(userId, mode, page + 1, ...);
      const already = await feedCache.get(nextPageCacheKey);
      if (!already) {
        // Prefetch page N+1 in background — don't await
        const nextResult = await feedRanker.generateFeed(userId, {
          mode, page: page + 1, limit, subject, excludeIds
        });
        // Cache with same TTL
        await feedCache.set(nextPageCacheKey, nextResult, FEED_RESPONSE_CACHE_TTL_SECONDS);
      }
    } catch { /* non-fatal — best effort prefetch */ }
  });
}
```

### Fix 5: Cloud Run min-instances (prevents cold starts)

In Cloud Run configuration or `cloudbuild.yaml`:
```yaml
# Set min instances to 1 to prevent cold starts
gcloud run deploy feed-service \
  --min-instances=1 \
  --max-instances=10 \
  --concurrency=80
```

This costs ~$5-10/month on Cloud Run but eliminates the 8-15s cold start timeout.

---

## How to Test

```bash
# Run with production Supabase data:
SKIP_DB_MIGRATE=1 STUNITY_ALLOW_PROD_DB=1 ./quick-start.sh

# Expected after fixes: no ECONNABORTED on /posts/feed for pages 1-10
# Green log pattern: ✅ GET /posts/feed - 200 (18 items) for every page

# Check Redis session cache hit rate:
# Add this log in feedRanker.ts generateFeed():
console.log(`[FeedRanker] Page ${page} cache ${cachedSequence ? 'HIT' : 'MISS'}`);
# After fix: should see HIT for pages 2-10
```

---

## Project Context

- **Working dir**: `/Users/naingseiha/Documents/projects/Stunity-Enterprise`
- **Backend**: Express.js at `services/feed-service/`
- **Database**: PostgreSQL via Supabase (ap-southeast-2, Sydney)
- **Cache**: Redis (Upstash)
- **Deployment**: Google Cloud Run (free tier, min-instances=0)
- **Mobile**: React Native Expo at `apps/mobile/`

### Key files already optimized (don't revert):
- `apps/mobile/src/screens/feed/FeedScreen.tsx` — 5 useMemos → 1, stable handlers
- `apps/mobile/src/stores/feedStore.ts` — timeouts already extended to 9-12s
- `apps/mobile/src/utils/mockEdScores.ts` — production no-op
- `services/feed-service/src/routes/posts.routes.ts` — edScore included in response

### Smart Scroll features (all implemented, don't touch unless asked):
- Recall Cards, Ed-Score Badges, Brain Mode, Feynman Bounties, Quiz Wars, Focus Reels
- All seeded at `packages/database/prisma/seed-smart-scroll.ts`
- See `SMART_SCROLL_HANDOVER.md` for full feature map

---

## Priority Order

1. **Fix 4 (Background prefetch)** — highest UX impact, no DB changes needed
2. **Fix 1 (Extend session cache + generate more)** — eliminates page 6+ regeneration
3. **Fix 5 (Cloud Run min-instances=1)** — eliminates cold starts
4. **Fix 2 (Prisma keepalive)** — reduces connection overhead
5. **Fix 3 (Response cache TTL)** — defense in depth

Start with Fix 4 + Fix 1 together — they address the same code path and together
should eliminate the "blank at bottom" completely.
