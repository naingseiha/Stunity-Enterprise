# Feed Service

Social feed microservice for Stunity Enterprise — personalized content delivery, engagement tracking, and user profiles.

## Architecture

```
src/
├── index.ts              # Entry point (middleware, health, server start)
├── context.ts            # Shared singletons (Prisma, FeedRanker, multer)
├── feedRanker.ts         # ML-style feed ranking (FOR_YOU / FOLLOWING / RECENT)
├── redis.ts              # Redis cache + EventPublisher
├── middleware/auth.ts     # JWT authentication
├── routes/
│   ├── posts.routes.ts       # GET /posts, /posts/feed, track-action/views
│   ├── postActions.routes.ts # CRUD posts, comments, polls, bookmarks
│   ├── quiz.routes.ts        # Quiz submit, attempts, leaderboard
│   ├── analytics.routes.ts   # Views, insights, trending
│   ├── profile.routes.ts     # User profiles, search, follow
│   ├── skills.routes.ts      # Skills CRUD, endorsements
│   ├── experience.routes.ts  # Experiences, certs, projects
│   ├── achievements.routes.ts# Achievements, recommendations
│   └── signals.routes.ts     # User feed signal tracking helper
├── sse.ts                # Server-Sent Events
├── dm.ts                 # Direct messaging
├── clubs.ts              # Club management
├── courses.ts            # Course & learning paths
├── stories.ts            # Stories
└── calendar.ts           # Calendar events
```

## Running

```bash
# Start (from project root)
./quick-start.sh

# Port
3010

# Health check
curl http://localhost:3010/health
```

## Performance Optimizations

| Feature | Impact |
|---------|--------|
| Cursor-based pagination | O(1) vs O(N) for deep pages |
| `fields=minimal` | ~76% smaller payloads |
| ETag caching | 304 Not Modified |
| Response compression | gzip for all responses |
| Batched `$transaction` | N+1 → 1 DB round-trip |
| Pre-computed feed cache | Top 100 users cached in Redis |
| Read replica ready | `prismaRead` for read-heavy queries |

## Deployment

Automatically deployed via GitHub Actions on push to `main`:

```
push → lint → build → Docker → Cloud Run (asia-southeast1)
```

See `.github/workflows/deploy-feed.yml`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Primary Supabase connection |
| `DATABASE_READ_URL` | ❌ | Read replica (falls back to primary) |
| `REDIS_URL` | ❌ | Redis cache (in-memory fallback) |
| `JWT_SECRET` | ✅ | Token signing |
| `R2_ACCESS_KEY_ID` | ❌ | Cloudflare R2 storage |
| `R2_SECRET_ACCESS_KEY` | ❌ | R2 secret |
| `R2_ENDPOINT` | ❌ | R2 endpoint URL |
| `R2_BUCKET_NAME` | ❌ | R2 bucket |
| `CDN_BASE_URL` | ❌ | CDN for optimized media |
