# 🏗️ Stunity Enterprise — Polyglot Database Architecture Plan

**Version:** 1.0 | **Created:** February 20, 2026  
**Status:** Planned — Phased Implementation

> This document is the definitive guide for evolving Stunity's database architecture from pure PostgreSQL to a polyglot system that scales to millions of users, while keeping costs near zero for the first 5K–50K users.

---

## 📋 Table of Contents
1. [Decision Summary](#decision-summary)
2. [Current State & Bottlenecks](#current-state--bottlenecks)
3. [Target Architecture](#target-architecture)
4. [Database Roles — What Goes Where](#database-roles--what-goes-where)
5. [Phase 1: Redis (Upstash) — Do First](#phase-1-redis-upstash--do-first)
6. [Phase 2: pgvector — Semantic AI](#phase-2-pgvector--semantic-ai)
7. [Phase 3: Typesense — Search](#phase-3-typesense--search)
8. [Phase 4: TimescaleDB — Analytics](#phase-4-timescaledb--analytics)
9. [Phase 5: Social Graph — PostgreSQL CTEs](#phase-5-social-graph--postgresql-ctes)
10. [Safety Rules — Nothing Breaks](#safety-rules--nothing-breaks)
11. [Cost Breakdown](#cost-breakdown)
12. [What We Are NOT Adding](#what-we-are-not-adding)

---

## Decision Summary

After analysis of data patterns across all 14 services and 103 database models, the architecture decision is:

| Database | Role | Cost | Status |
|----------|------|------|--------|
| **PostgreSQL (Supabase)** | Core: all relational data, social graph, transactions | $0 → $25/mo | ✅ Active |
| **pgvector** (Supabase extension) | AI recommendations, semantic search, user similarity | $0 forever | 🔲 Phase 2 |
| **Redis (Upstash)** | Live quiz state, feed cache, leaderboards, rate limiting | $0 → ~$10/mo | 🔲 Phase 1 |
| **Typesense Cloud** | Full-text search, autocomplete, fuzzy matching | $0 → ~$5/mo | 🔲 Phase 3 |
| **TimescaleDB** (Supabase extension) | Time-series analytics (PostView trends, engagement) | $0 forever | 🔲 Phase 4 |

**No separate graph database.** PostgreSQL recursive CTEs + pgvector handle the social graph the same way LinkedIn did until 175M users.

**No MongoDB, DynamoDB, Cassandra, Neptune, or Neo4j.** Each would add operational cost and complexity without measurable benefit at Stunity's scale.

---

## Current State & Bottlenecks

### What Works Well (Keep Forever)

```
✅ School management: grades, attendance, timetables, enrollment
   → ACID transactions required (grades are legal records)
   → Complex JOINs across Student/Grade/Subject/Class
   → PostgreSQL is the only correct choice

✅ Authentication: users, roles, JWT, claim codes
✅ Posts, comments, likes, bookmarks, notifications
✅ Quizzes, courses, assignments, submissions
✅ Clubs, DMs, Supabase Realtime subscriptions
✅ Quiz questions stored as JSONB (no need for MongoDB)
✅ Poll options stored as JSONB (no need for MongoDB)
```

### Current Bottlenecks

```
❌ Search: ILIKE '%term%' = full table scan
   → No ranking, no fuzzy match, no autocomplete
   → At 1M posts: 2-5 second query time
   → Fix: Typesense (Phase 3)

❌ Live quiz: new Map<string, LiveQuizSession>()
   → Stored in Node.js memory — lost on every Cloud Run redeploy
   → Single instance only — two Cloud Run instances = two separate games
   → Fix: Redis Hashes (Phase 1) — MOST URGENT

❌ Leaderboard: Array.sort() after fetching all participants
   → Acceptable at 50 players, broken at 1000 players
   → Fix: Redis Sorted Sets (Phase 1)

❌ Feed recommendations: tag matching only
   → Shows posts with matching hashtag, misses semantically related content
   → Fix: pgvector cosine similarity (Phase 2)

❌ "Who to follow": feature doesn't exist yet
   → Fix: PostgreSQL recursive CTEs + pgvector (Phase 5)

❌ Analytics queries: COUNT(*) on PostView rows
   → Acceptable at 1M rows, slow at 100M rows
   → Fix: TimescaleDB hypertable (Phase 4)
```

---

## Target Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                                    │
│         Mobile (Expo SDK 54)          Web (Next.js 14)            │
└──────────────────┬───────────────────────────┬───────────────────┘
                   │ HTTPS                     │ HTTPS
┌──────────────────▼───────────────────────────▼───────────────────┐
│                  14 MICROSERVICES (Express.js)                     │
│                      Google Cloud Run                              │
└────────┬──────────────┬─────────────────┬──────────┬─────────────┘
         │              │                 │          │
┌────────▼──────┐ ┌─────▼─────┐ ┌────────▼───┐ ┌───▼──────────────┐
│  PostgreSQL   │ │   Redis   │ │ Typesense  │ │   Supabase       │
│  (Supabase)   │ │ (Upstash) │ │  (Cloud)   │ │   Realtime       │
│               │ │           │ │            │ │                   │
│ + pgvector ◄──┤ │ • Feed    │ │ • Posts    │ │ • postgres_changes│
│ + TimescaleDB │ │   cache   │ │   index    │ │ • Notifications   │
│               │ │ • Live    │ │ • Users    │ │ • Comments        │
│ School mgmt   │ │   quiz    │ │   index    │ │ • Feed new posts  │
│ Social posts  │ │ • Leader- │ │ • Clubs    │ └───────────────────┘
│ Auth/Users    │ │   boards  │ │   index    │
│ Quizzes       │ │ • Rate    │ │ • Autocmp  │
│ Notifications │ │   limits  │ └────────────┘
│ Follows       │ │ • Online  │
│ + Semantic    │ │   users   │
│   vectors     │ └───────────┘
│ + Time-series │
│   analytics   │
└───────────────┘
```

### Data Flow Rules
1. **PostgreSQL is always the source of truth for writes**
2. **Redis, Typesense, TimescaleDB are derived/cached data for reads**
3. **If any secondary DB fails → always fall back to PostgreSQL**
4. **Supabase Realtime is the primary real-time channel (never replace)**

---

## Database Roles — What Goes Where

### PostgreSQL (Source of Truth — Everything)
```
ALL school management data (grades, attendance, timetables)
ALL user auth data (JWT tokens, claim codes, roles)
ALL social data (posts, comments, likes, follows)
ALL quiz/course/assignment data
ALL notifications
Social graph (Follow table) — handles to 200K+ users
```

### Redis (Real-Time State & Cache)
```
Live quiz sessions      → survives redeploys, multi-instance safe
Leaderboard scores      → O(log N) sorted set queries
Feed cache per user     → 15-minute TTL (already architected)
Rate limiting counters  → per user/IP with auto-expiry
Online presence         → SETEX with 30s TTL
JWT blacklist           → for logout/revocation
Session tokens          → fast lookup before DB hit
```

### pgvector (AI/Semantic Layer — Inside PostgreSQL)
```
Post content embeddings → "similar posts" recommendations
User interest vectors   → "who to follow" by shared interests
Subject/topic vectors   → course and quiz recommendations
School content vectors  → relevant learning material surface
```

### Typesense (Search Layer)
```
Posts index        → full-text, fuzzy, ranked search
Users index        → name search with autocomplete
Clubs index        → club discovery search
Courses index      → course search
Sync strategy:     → write to PostgreSQL first, then Typesense async
Fallback:          → PostgreSQL ILIKE if Typesense unavailable
```

### TimescaleDB (Time-Series — Inside PostgreSQL)
```
post_views_ts      → view counts over time (hourly/daily buckets)
engagement_ts      → likes/comments/shares trends
school_activity_ts → per-school activity metrics
```

---

## Phase 1: Redis (Upstash) — Do First

**Why first:** Live quiz state loss is an active reliability bug, not a future scaling concern.

### Setup (30 minutes)
```bash
# 1. Create free account at https://upstash.com
# 2. Create a Redis database (Global / Frankfurt or Singapore)
# 3. Copy the REDIS_URL from dashboard

# Set in Cloud Run environment (also local .env):
REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_HOST.upstash.io:6379
```

The `REDIS_URL` environment variable is already wired in `services/feed-service/src/redis.ts` line 68. Just set the env var and it activates.

### Fix 1: Live Quiz State (analytics-service)

**File:** `services/analytics-service/src/index.ts`

**Current (broken):**
```ts
const liveSessions = new Map<string, LiveQuizSession>();
// Comment on line 93 already says: "use Redis in production"
```

**Replace with:**
```ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// Store session: HSET session:{code} field value [field value ...]
async function setSession(code: string, data: Partial<LiveQuizSession>) {
  await redis.hset(`session:${code}`, data as any);
  await redis.expire(`session:${code}`, 7200); // 2h auto-cleanup
}

// Read session: HGETALL session:{code}
async function getSession(code: string): Promise<LiveQuizSession | null> {
  const data = await redis.hgetall(`session:${code}`);
  return Object.keys(data).length ? (data as unknown as LiveQuizSession) : null;
}

// Participant score: Redis Sorted Set for O(log N) rank
async function updateScore(code: string, userId: string, score: number) {
  await redis.zadd(`leaderboard:${code}`, score, userId);
}

async function getLeaderboard(code: string, top = 10) {
  const results = await redis.zrevrange(`leaderboard:${code}`, 0, top - 1, 'WITHSCORES');
  // Parse [[userId, score], ...] pairs
  const leaderboard = [];
  for (let i = 0; i < results.length; i += 2) {
    leaderboard.push({ userId: results[i], score: parseInt(results[i + 1]) });
  }
  return leaderboard;
}

async function getRank(code: string, userId: string): Promise<number> {
  const rank = await redis.zrevrank(`leaderboard:${code}`, userId);
  return rank !== null ? rank + 1 : 0;
}
```

### Fix 2: Rate Limiting (feed-service)

**File:** `services/feed-service/src/index.ts`

Add after existing middleware:
```ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// Only enable Redis rate limiting if REDIS_URL is set
if (process.env.REDIS_URL) {
  const redisRateLimitStore = new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
  });

  app.use('/posts', rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    store: redisRateLimitStore,
    message: { error: 'Too many posts, slow down' }
  }));
}
// Install: npm install express-rate-limit rate-limit-redis --workspace=services/feed-service
```

### Fix 3: Online Presence (feed-service)

```ts
// Track online users (heartbeat every 20s from client)
app.post('/users/heartbeat', authenticate, async (req, res) => {
  if (redisClient) {
    await redisClient.setex(`online:${req.user!.id}`, 30, '1');
  }
  res.json({ ok: true });
});

// Get online count for a school
app.get('/schools/:schoolId/online-count', authenticate, async (req, res) => {
  if (!redisClient) return res.json({ count: 0 });
  const keys = await scanRedisKeys(`online:*`); // uses cursor SCAN, not KEYS
  res.json({ count: keys.length });
});
```

### Verification Checklist
- [ ] `REDIS_URL` env var set in Cloud Run and local `.env`
- [ ] Live quiz: start a game, redeploy service, game still active
- [ ] Leaderboard: 100 participants, rank query < 10ms
- [ ] Feed cache: second load of same feed returns 304 (ETag hit)
- [ ] Rate limit: 31 posts in 60s returns 429

---

## Phase 2: pgvector — Semantic AI

**Why:** Post recommendations by tag matching misses semantically related content. pgvector enables "you'd like this" recommendations based on meaning, not keywords.

### Setup (5 minutes)
```sql
-- Run once in Supabase SQL editor:
CREATE EXTENSION IF NOT EXISTS vector;
```

### Schema Changes

**File:** `packages/database/prisma/schema.prisma`

```prisma
// Add to Post model:
model Post {
  // ... existing fields ...
  embedding   Unsupported("vector(384)")?  // content embedding, nullable
}

// Add to User model:
model User {
  // ... existing fields ...
  interestEmbedding  Unsupported("vector(384)")?  // interest vector, nullable
}
```

```bash
# Apply migration:
cd packages/database
npx prisma db push  # or npx prisma migrate dev --name add_embeddings
```

### Embedding Generation Service

**New file:** `services/feed-service/src/embeddings.ts`

```ts
// Uses Hugging Face Inference API (free tier: ~30K requests/month)
// Model: sentence-transformers/all-MiniLM-L6-v2 (384 dimensions)

const HF_API_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';

export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!process.env.HUGGINGFACE_API_KEY) return null; // graceful skip

  try {
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text.slice(0, 512) }), // truncate long posts
    });

    if (!response.ok) return null;
    const result = await response.json();
    // Returns array of 384 floats
    return Array.isArray(result[0]) ? result[0] : result;
  } catch {
    return null; // never block post creation if embedding fails
  }
}

// Format vector for Prisma raw query
export function formatVector(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
```

### Generate Embedding on Post Create

**File:** `services/feed-service/src/routes/postActions.routes.ts`

Add after post creation (non-blocking — doesn't slow down the API response):
```ts
// After prisma.post.create() succeeds:
const post = await prisma.post.create({ data: postData });

// Generate embedding asynchronously — never blocks response
generateEmbedding(`${post.title || ''} ${post.content || ''}`).then(async (embedding) => {
  if (embedding) {
    await prisma.$executeRaw`
      UPDATE "Post" SET embedding = ${formatVector(embedding)}::vector
      WHERE id = ${post.id}
    `;
  }
}).catch(() => {}); // silent fail — embedding is optional

res.json({ success: true, post });
```

### Semantic Feed Scoring

**File:** `services/feed-service/src/feedRanker.ts`

Add as a new optional scoring factor:
```ts
// Get user's interest embedding (cached in Redis, refreshed daily)
async function getUserInterestEmbedding(userId: string): Promise<number[] | null> {
  // Check Redis cache first
  if (redisClient) {
    const cached = await redisClient.get(`user:embedding:${userId}`);
    if (cached) return JSON.parse(cached);
  }

  // Build from recently liked posts
  const recentLikes = await prisma.like.findMany({
    where: { userId, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
    include: { post: { select: { content: true, title: true } } },
    take: 20,
  });

  if (recentLikes.length === 0) return null;

  const combinedText = recentLikes
    .map(l => `${l.post.title || ''} ${l.post.content || ''}`)
    .join(' ').slice(0, 512);

  const embedding = await generateEmbedding(combinedText);

  // Cache for 24 hours
  if (embedding && redisClient) {
    await redisClient.setex(`user:embedding:${userId}`, 86400, JSON.stringify(embedding));
  }

  return embedding;
}

// Semantic similarity score for a post (0.0 → 1.0)
async function getSemanticScore(postId: string, userEmbedding: number[]): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ similarity: number }>>`
    SELECT 1 - (embedding <=> ${formatVector(userEmbedding)}::vector) AS similarity
    FROM "Post"
    WHERE id = ${postId} AND embedding IS NOT NULL
  `;
  return result[0]?.similarity ?? 0;
}
```

Update the 6-factor scoring to 7-factor:
```ts
// In computePostScore(), add semantic factor:
const semanticScore = userEmbedding
  ? await getSemanticScore(post.id, userEmbedding)
  : 0;

// Adjust weights (semantic replaces some of learning context):
const finalScore =
  engagementScore  * 0.25 +
  relevanceScore   * 0.20 +  // slightly reduced
  qualityScore     * 0.15 +
  recencyScore     * 0.15 +
  socialProof      * 0.10 +
  learningContext  * 0.08 +  // slightly reduced
  semanticScore    * 0.07;   // new: semantic similarity
```

### "Who to Follow" Recommendations

**New endpoint in:** `services/feed-service/src/routes/userProfile.routes.ts`

```ts
// GET /users/suggestions — "Who to follow"
router.get('/users/suggestions', authenticate, async (req, res) => {
  const userId = req.user!.id;
  const limit = 10;

  // Strategy 1: 2nd-degree connections (mutual follows) — PostgreSQL CTE
  const mutualConnections = await prisma.$queryRaw<Array<{id: string; name: string; mutualCount: number}>>`
    WITH my_network AS (
      SELECT "followingId" FROM "Follow" WHERE "followerId" = ${userId}
    ),
    suggestions AS (
      SELECT f."followingId" AS id, COUNT(*) AS mutual_count
      FROM "Follow" f
      INNER JOIN my_network n ON f."followerId" = n."followingId"
      WHERE f."followingId" != ${userId}
        AND f."followingId" NOT IN (SELECT "followingId" FROM my_network)
      GROUP BY f."followingId"
      ORDER BY mutual_count DESC
      LIMIT ${limit}
    )
    SELECT u.id, u.name, u.avatar, s.mutual_count AS "mutualCount"
    FROM suggestions s JOIN "User" u ON u.id = s.id
  `;

  // Strategy 2: Interest similarity (pgvector) — only if embeddings available
  let interestBased: any[] = [];
  const userEmbedding = await getUserInterestEmbedding(userId);
  if (userEmbedding) {
    interestBased = await prisma.$queryRaw`
      SELECT id, name, avatar,
             1 - ("interestEmbedding" <=> ${formatVector(userEmbedding)}::vector) AS similarity
      FROM "User"
      WHERE id != ${userId}
        AND "interestEmbedding" IS NOT NULL
        AND id NOT IN (SELECT "followingId" FROM "Follow" WHERE "followerId" = ${userId})
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;
  }

  // Strategy 3: Same school, active users
  const sameSchool = await prisma.user.findMany({
    where: {
      schoolId: req.user!.schoolId,
      id: { not: userId },
      NOT: { followers: { some: { followerId: userId } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, name: true, avatar: true },
  });

  // Merge and deduplicate, mutual > interest > same school
  const seen = new Set<string>();
  const combined = [...mutualConnections, ...interestBased, ...sameSchool]
    .filter(u => !seen.has(u.id) && seen.add(u.id))
    .slice(0, limit);

  res.json({ suggestions: combined });
});
```

### Backfill Existing Posts
```ts
// One-time script to generate embeddings for all existing posts:
// Run: ts-node scripts/backfill-embeddings.ts

const posts = await prisma.post.findMany({
  where: { embedding: null },
  select: { id: true, title: true, content: true },
});

for (const post of posts) {
  const text = `${post.title || ''} ${post.content || ''}`.trim();
  if (!text) continue;

  const embedding = await generateEmbedding(text);
  if (embedding) {
    await prisma.$executeRaw`
      UPDATE "Post" SET embedding = ${formatVector(embedding)}::vector
      WHERE id = ${post.id}
    `;
  }
  await new Promise(r => setTimeout(r, 100)); // 10 req/sec, stay under free tier
}
```

### Verification Checklist
- [ ] `CREATE EXTENSION vector;` confirmed in Supabase
- [ ] `HUGGINGFACE_API_KEY` set in Cloud Run and `.env`
- [ ] New post creates embedding within 2 seconds (async)
- [ ] Existing posts backfilled (run `backfill-embeddings.ts` once)
- [ ] Feed shows semantically related posts (test with topic-specific content)
- [ ] `/users/suggestions` returns users with mutual connections
- [ ] If `HUGGINGFACE_API_KEY` missing → feed still works (semantic score = 0)

---

## Phase 3: Typesense — Search

**Why:** 27 places in the codebase use `contains: mode: 'insensitive'` (ILIKE). At 1M+ posts this becomes a full table scan. Typesense delivers 10–50ms ranked full-text search.

### Setup (1 hour)
```
1. Create account: https://cloud.typesense.org
2. Create cluster: Free tier (100K documents, 3 nodes)
3. Get API key and host from dashboard

Environment variables:
TYPESENSE_HOST=xyz.a1.typesense.net
TYPESENSE_API_KEY=your_key_here
TYPESENSE_PORT=443
TYPESENSE_PROTOCOL=https
```

### Schema Definition

**New file:** `services/feed-service/src/typesense.ts`

```ts
import Typesense from 'typesense';

export const typesenseClient = process.env.TYPESENSE_API_KEY
  ? new Typesense.Client({
      nodes: [{ host: process.env.TYPESENSE_HOST!, port: 443, protocol: 'https' }],
      apiKey: process.env.TYPESENSE_API_KEY,
      connectionTimeoutSeconds: 2,
    })
  : null;

// Collection schemas
export const POSTS_SCHEMA = {
  name: 'posts',
  fields: [
    { name: 'id',         type: 'string' },
    { name: 'title',      type: 'string', optional: true },
    { name: 'content',    type: 'string' },
    { name: 'postType',   type: 'string', facet: true },
    { name: 'authorName', type: 'string' },
    { name: 'schoolId',   type: 'string', optional: true, facet: true },
    { name: 'topicTags',  type: 'string[]', facet: true },
    { name: 'createdAt',  type: 'int64' },
    { name: 'likesCount', type: 'int32' },
  ],
  default_sorting_field: 'likesCount',
};

export const USERS_SCHEMA = {
  name: 'users',
  fields: [
    { name: 'id',       type: 'string' },
    { name: 'name',     type: 'string' },
    { name: 'role',     type: 'string', facet: true },
    { name: 'schoolId', type: 'string', optional: true, facet: true },
    { name: 'bio',      type: 'string', optional: true },
  ],
};

// Initialize collections (run once on service start)
export async function initTypesense() {
  if (!typesenseClient) return;
  for (const schema of [POSTS_SCHEMA, USERS_SCHEMA]) {
    try {
      await typesenseClient.collections(schema.name).retrieve();
    } catch {
      await typesenseClient.collections().create(schema as any);
      console.log(`✅ Typesense collection created: ${schema.name}`);
    }
  }
}
```

### Sync Posts to Typesense

**File:** `services/feed-service/src/routes/postActions.routes.ts`

Add sync after every post create/update/delete (non-blocking):
```ts
// After post create:
syncToTypesense('upsert', 'posts', {
  id: post.id,
  title: post.title || '',
  content: post.content || '',
  postType: post.postType,
  authorName: post.author?.name || '',
  schoolId: post.author?.schoolId || '',
  topicTags: post.topicTags || [],
  createdAt: Math.floor(new Date(post.createdAt).getTime() / 1000),
  likesCount: 0,
}).catch(() => {}); // never block on Typesense failure

// After post delete:
syncToTypesense('delete', 'posts', post.id).catch(() => {});

// Sync helper (fire-and-forget):
async function syncToTypesense(op: 'upsert' | 'delete', collection: string, data: any) {
  if (!typesenseClient) return;
  if (op === 'delete') {
    await typesenseClient.collections(collection).documents(data).delete();
  } else {
    await typesenseClient.collections(collection).documents().upsert(data);
  }
}
```

### Updated Search Endpoint

**File:** `services/feed-service/src/routes/posts.routes.ts`

```ts
// Updated search handler — Typesense first, PostgreSQL ILIKE fallback:
if (search && typeof search === 'string' && search.trim()) {
  const searchTerm = search.trim();

  // Try Typesense first
  if (typesenseClient) {
    try {
      const result = await typesenseClient.collections('posts').documents().search({
        q: searchTerm,
        query_by: 'title,content,topicTags,authorName',
        filter_by: schoolId ? `schoolId:=${schoolId}` : '',
        sort_by: '_text_match:desc,likesCount:desc',
        num_typos: 2,           // fuzzy: "calculs" finds "calculus"
        per_page: Number(limit),
      });

      const postIds = result.hits?.map(h => h.document.id) ?? [];
      if (postIds.length > 0) {
        // Fetch full posts from PostgreSQL in order
        const posts = await prisma.post.findMany({ where: { id: { in: postIds } }, include: { ... } });
        // Preserve Typesense relevance order
        return res.json({ posts: postIds.map(id => posts.find(p => p.id === id)).filter(Boolean) });
      }
    } catch (err) {
      console.warn('Typesense search failed, falling back to PostgreSQL:', err.message);
    }
  }

  // PostgreSQL ILIKE fallback (always works):
  whereClause.OR = [
    { content: { contains: searchTerm, mode: 'insensitive' } },
    { title: { contains: searchTerm, mode: 'insensitive' } },
    { topicTags: { hasSome: [searchTerm.toLowerCase()] } },
  ];
}
```

### Verification Checklist
- [ ] `TYPESENSE_HOST` + `TYPESENSE_API_KEY` set in Cloud Run and `.env`
- [ ] Collections created on service start (`initTypesense()` called)
- [ ] New post appears in Typesense search within 1 second
- [ ] Fuzzy search: "calculs" finds "calculus" posts
- [ ] If Typesense is unreachable → PostgreSQL ILIKE fallback works
- [ ] Backfill script run for existing posts

---

## Phase 4: TimescaleDB — Analytics

**Why:** `PostView` table will hit 100M+ rows when the platform scales. `COUNT(*)` queries become slow. TimescaleDB partitions by time, making time-range queries 50–100× faster.

### Setup (30 minutes in Supabase SQL editor)
```sql
-- Enable extension (free on Supabase):
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create time-series table for post views:
CREATE TABLE IF NOT EXISTS post_views_ts (
  time       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  post_id    TEXT NOT NULL,
  viewer_id  TEXT,
  school_id  TEXT,
  source     TEXT  -- 'feed', 'search', 'profile', 'direct'
);

SELECT create_hypertable('post_views_ts', 'time',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Index for per-post queries:
CREATE INDEX ON post_views_ts (post_id, time DESC);

-- Continuous aggregate: hourly view counts per post (pre-computed):
CREATE MATERIALIZED VIEW post_views_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS hour,
  post_id,
  COUNT(*) AS view_count,
  COUNT(DISTINCT viewer_id) AS unique_viewers
FROM post_views_ts
GROUP BY hour, post_id
WITH NO DATA;

SELECT add_continuous_aggregate_policy('post_views_hourly',
  start_offset => INTERVAL '3 days',
  end_offset   => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);
```

### Analytics Query Changes

**File:** `services/feed-service/src/routes/analytics.routes.ts`

Replace heavy `PostView` COUNT queries with TimescaleDB:
```ts
// Views over time (uses pre-computed hourly aggregate — extremely fast):
const viewsTrend = await prisma.$queryRaw`
  SELECT hour, view_count, unique_viewers
  FROM post_views_hourly
  WHERE post_id = ${postId}
    AND hour >= NOW() - ${period}::interval
  ORDER BY hour ASC
`;

// Total views (uses continuous aggregate, not raw table scan):
const totalViews = await prisma.$queryRaw`
  SELECT SUM(view_count) AS total, SUM(unique_viewers) AS unique
  FROM post_views_hourly
  WHERE post_id = ${postId}
    AND hour >= NOW() - ${period}::interval
`;
```

### Verification Checklist
- [ ] `CREATE EXTENSION timescaledb` confirmed
- [ ] `post_views_ts` hypertable created
- [ ] New post views insert to `post_views_ts` (alongside existing `PostView` table initially)
- [ ] Analytics endpoint uses `post_views_hourly` view
- [ ] Query time for viral post analytics < 100ms

---

## Phase 5: Social Graph — PostgreSQL CTEs

**Why:** LinkedIn ran their entire social graph on relational databases until 175M users. PostgreSQL with proper indexes handles Stunity's social graph to 200K+ users with no additional DB.

### Required Indexes (Run Once)
```sql
-- Already standard, but verify these exist:
CREATE INDEX IF NOT EXISTS "Follow_followerId_idx"  ON "Follow"("followerId");
CREATE INDEX IF NOT EXISTS "Follow_followingId_idx" ON "Follow"("followingId");
CREATE INDEX IF NOT EXISTS "Follow_pair_idx"        ON "Follow"("followerId", "followingId");

-- Post author school index (feed relevance pool):
CREATE INDEX IF NOT EXISTS "Post_authorSchoolId_createdAt_idx"
  ON "Post"("authorSchoolId", "createdAt" DESC);
```

### "Who to Follow" Query (Pure PostgreSQL)
```sql
-- 2nd-degree connections: people followed by users you follow
-- Runs in < 50ms with indexes, good to 500K follow relationships
WITH my_network AS (
  SELECT "followingId" FROM "Follow" WHERE "followerId" = $userId
),
second_degree AS (
  SELECT f."followingId" AS suggested_id, COUNT(*) AS mutual_count
  FROM "Follow" f
  INNER JOIN my_network n ON f."followerId" = n."followingId"
  WHERE f."followingId" != $userId
    AND f."followingId" NOT IN (SELECT "followingId" FROM my_network)
  GROUP BY f."followingId"
  ORDER BY mutual_count DESC
  LIMIT 10
)
SELECT u.id, u.name, u.avatar, u."schoolId", s.mutual_count
FROM second_degree s
JOIN "User" u ON u.id = s.suggested_id;
```

### When to Consider a Graph Database
```
Decision point: Run EXPLAIN ANALYZE on the above query.
  - If execution time < 200ms at your current user count → stay on PostgreSQL
  - If execution time > 500ms at 100K+ users → consider FalkorDB ($8/month on Cloud Run)
  - Never add Neo4j or Amazon Neptune at your current scale (overpriced for marginal gain)
```

---

## Safety Rules — Nothing Breaks

### Rule 1: New Databases Are Read-Only for Recommendations
```
PostgreSQL  = source of truth for ALL writes
Redis       = cache layer (rebuilds if lost, never primary)
Typesense   = search index (rebuilt from PostgreSQL if lost)
pgvector    = inside PostgreSQL (same DB, no sync needed)
TimescaleDB = inside PostgreSQL (same DB, same connection)
```

### Rule 2: Always Fall Back to PostgreSQL
```ts
// Pattern for EVERY new DB integration:
async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  label: string
): Promise<T> {
  try {
    return await primary();
  } catch (err) {
    console.warn(`${label} failed, using fallback:`, (err as Error).message);
    return await fallback();
  }
}

// Usage:
const results = await withFallback(
  () => typesenseSearch(query),
  () => postgresSearch(query),
  'Typesense'
);
```

### Rule 3: New Columns Are Always Nullable
```prisma
// ✅ Safe — existing rows unaffected:
embedding   Unsupported("vector(384)")?

// ❌ Dangerous — breaks existing inserts:
embedding   Unsupported("vector(384)")
```

### Rule 4: Async Enrichment Never Blocks Responses
```ts
// ✅ Correct — post is created immediately, embedding generated after:
const post = await prisma.post.create({ data: ... });
res.json({ post }); // respond immediately

generateEmbedding(text).then(embedding => {
  if (embedding) updatePostEmbedding(post.id, embedding);
}).catch(() => {}); // silent fail

// ❌ Wrong — user waits for embedding generation:
const embedding = await generateEmbedding(text); // 200-500ms delay
const post = await prisma.post.create({ data: { ...postData, embedding } });
res.json({ post });
```

### Rule 5: Feature Flags for Each Phase
```
REDIS_URL           → missing = in-memory fallback (already implemented)
HUGGINGFACE_API_KEY → missing = skip embeddings, feed still works
TYPESENSE_API_KEY   → missing = skip Typesense, PostgreSQL search used
All phases degrade gracefully to existing behavior.
```

---

## Cost Breakdown

### Free Tier (0 → 5K users)
```
PostgreSQL (Supabase Free)    $0    500MB DB, 50K MAU
pgvector (Supabase extension) $0    inside existing PostgreSQL
TimescaleDB (Supabase ext)    $0    inside existing PostgreSQL
Upstash Redis                 $0    10K commands/day free
Typesense Cloud               $0    100K documents free
Hugging Face API              $0    ~30K inference requests/month
Google Cloud Run              $0    2M requests/month free
─────────────────────────────────────────
Total:                        $0/month
```

### Growth Tier (5K → 50K users, ~$40/month)
```
PostgreSQL (Supabase Pro)     $25   8GB DB, 50K MAU, daily backups
pgvector                      $0    included in Supabase Pro
TimescaleDB                   $0    included in Supabase Pro
Upstash Redis (pay-as-you-go) $10   ~5M commands/month
Typesense Cloud               $5    after 100K documents
─────────────────────────────────────────
Total:                        $40/month
```

### Scale Tier (50K → 500K users, ~$150-300/month)
```
PostgreSQL (Supabase Team)    $599  + read replica
  or self-managed on GCP      ~$100-200
Redis cluster                 $50
Typesense Standard            $50
Hugging Face dedicated        $0-99 depending on volume
─────────────────────────────────────────
Total:                        $200-400/month
At this scale, revenue covers infra costs
```

---

## What We Are NOT Adding

| Database | Reason Not Needed |
|----------|------------------|
| **MongoDB** | PostgreSQL JSONB handles quiz questions, poll options, settings perfectly. Adding Mongo = duplicate data + sync problems |
| **DynamoDB** | Not a graph DB. No free tier after year 1. AWS lock-in. Redis does key-value better and cheaper |
| **Amazon Neptune** | No free tier. $47+/month. More expensive than Neo4j. Only if fully committed to AWS ecosystem |
| **Neo4j Professional** | $65/month. PostgreSQL CTEs handle social graph to 200K users for $0 extra |
| **Cassandra/ScyllaDB** | Over-engineered. Only makes sense at 10B+ rows. Adds massive operational complexity |
| **InfluxDB** | TimescaleDB is built into PostgreSQL/Supabase. No need for a separate time-series DB |
| **Kafka/Pub-Sub** | Google Cloud Tasks handles async jobs for free. Add Kafka only at 10M+ events/day |

---

## Implementation Order

```
Phase 1 — Redis        1 day    Live quiz fix (urgent), leaderboards, rate limiting
Phase 2 — pgvector     2-3 days Semantic feed, "who to follow", AI recommendations
Phase 3 — Typesense    2-3 days Full-text search, autocomplete, fuzzy matching
Phase 4 — TimescaleDB  1 day    Analytics time-series (when PostView > 10M rows)
Phase 5 — PG indexes   30 min   Social graph optimization (run SQL, no code change)

Total: ~7-9 days of implementation
All phases are independent — can be done in any order
All phases degrade gracefully if the new DB is unavailable
```

---

## Related Documents
- [`DEVELOPER_GUIDE.md`](../DEVELOPER_GUIDE.md) — Full architecture reference
- [`FEED_SYSTEM.md`](./FEED_SYSTEM.md) — Feed algorithm details
- [`SCHOOL_SOCIAL_INTEGRATION.md`](./SCHOOL_SOCIAL_INTEGRATION.md) — School ↔ social bridge
- [`/NEXT_IMPLEMENTATION.md`](../NEXT_IMPLEMENTATION.md) — Full feature roadmap
