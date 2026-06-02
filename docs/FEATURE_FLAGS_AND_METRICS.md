# Feature Flags & Metrics

How the engagement features ship safely (flags + gradual rollout) and how to make
them measurable (events → dashboards / experiments). Companion to
`docs/STUNITY_v2_IMPLEMENTATION_ROADMAP.md` §6–§7.

---

## 1. Feature flags (shipped, working today)

A provider-agnostic flag system with deterministic percentage rollout — the same
bucketing model GrowthBook/PostHog use — runs **without any external account**.

### How it works

```
analytics-service/src/featureFlags.ts   ← source of truth (FLAG_DEFINITIONS)
   GET /feature-flags  (authenticated)  ← resolves flags for the calling user
        │
        ▼
apps/mobile/src/config/featureFlags.ts  ← fetches on launch, caches to AsyncStorage
   isFeatureEnabled(key) / useFeatureFlag(key)
        │
        ▼
   gated components (default ON):
   reactions · endorsements · mastery_tree · streak_leaderboard · streak_ring
```

- **Rollout math:** `bucket = sha256(`${userId}:${key}`) % 100`; flag is on when
  `bucket < rollout%`. Stable per user, independent per flag — so a 10% rollout
  always hits the *same* 10% of users, and you can ramp 10 → 50 → 100 safely.
- **Kill switch:** set a flag's `enabled: false` to hard-disable instantly.
- **Fail-safe:** mobile defaults every engagement flag to ON; a failed/absent
  fetch never hides a shipped feature. The server is the authority for turning
  something *off*.

### Changing a rollout today

Edit `FLAG_DEFINITIONS` in `analytics-service/src/featureFlags.ts` and redeploy:

```ts
{ key: 'reactions', description: '...', enabled: true, rollout: 50 }, // ramp to 50%
```

### Next step: make flags editable without a deploy

Move `FLAG_DEFINITIONS` into a `FeatureFlag` table and read it in
`resolveFlagsForUser` (cache for ~60s). Then an admin screen can flip rollouts
live. The mobile contract (`GET /feature-flags`) stays identical.

### Swapping in GrowthBook (when you have an account)

Two options, both keep the mobile app unchanged:

1. **Server-side eval (recommended):** in `resolveFlagsForUser`, call the
   GrowthBook Node SDK with `{ id: userId }` attributes and return its evaluated
   booleans. `GET /feature-flags` is unchanged; mobile keeps gating via
   `useFeatureFlag`.
2. **Client SDK:** add `@growthbook/growthbook-react`, initialize with the user
   id on launch, and have `isFeatureEnabled` read from the GrowthBook instance
   instead of `/feature-flags`. Use this if you want client-side experiment
   exposure tracking out of the box.

Set `NEXT_PUBLIC_GROWTHBOOK_*` / `GROWTHBOOK_API_HOST` + SDK key envs at that point.

---

## 2. Metrics (the §7 north-star + guardrails)

| Metric | Definition | Status |
|---|---|---|
| **WAD/MAU** (north star) | weekly active days / MAU | ✅ **computed** by `GET /metrics/summary` |
| **Profile ≥80% in 7d** | % new users | ✅ **computed** (`topOfFunnel.pct`) |
| **% DAU w/ ≥1 recall review** | engagement loop | ✅ **computed** (`engagementLoop.pctDauRecall`) |
| **Notifications/user/day** (anti-metric) | non-urgent push ≤3 | ✅ **enforced** + reported (`antiMetric.nonUrgentNotifsPerDauToday`) |

### Events pipeline (shipped)

```
mobile  src/services/analytics.ts  track(name, props)  → batched, flush on timer/fill/background
   │  events: app_open · recall_review · post_reaction · endorsement_given · repost_created
   ▼
analytics-service  POST /events  → AnalyticsEvent rows + UserActiveDay upsert (active-day rollup)
analytics-service  GET /metrics/summary  (admin)  → north-star + §7 metrics, school-scoped (SUPER_ADMIN = global)
```

- `UserActiveDay` makes WAD/MAU a cheap distinct-day count (no event-stream scan).
- `track()` is best-effort: failures are dropped, never block or crash the app.
- Add more events by calling `track('<name>', { ... })` anywhere; any event marks
  the user active for the day.

### Still optional (needs your account)

### What's already measurable

- **Anti-metric** is enforced, not just measured: `MAX_NON_URGENT_PUSH_PER_DAY = 3`
  gates the streak + digest jobs.
- **Recall reviews** are persisted (`RecallReview` rows with `reviewedAt`), so
  "% DAU with a review" is a query away.
- **profileCompleteness** is persisted and refreshed on profile view.

### What to build for full measurement

There is **no generic analytics-events table yet**. To compute WAD/MAU and feed an
experiment tool, add a lightweight event stream:

1. **Schema** — `AnalyticsEvent { id, userId, name, props Json, createdAt, @@index([userId, createdAt]), @@index([name, createdAt]) }`.
2. **Ingestion** — `POST /events` (batched) in analytics-service; mobile fires
   `app_open`, `recall_review`, `post_reaction`, `endorsement_given`, etc. Keep a
   thin client `track(name, props)` that batches and flushes.
3. **Rollups** — a daily cron writes per-user active-day rows; WAD/MAU = distinct
   active days in the trailing 7 / distinct MAU. Reuse the
   `infrastructure/cloud-scheduler` pattern.
4. **Experiment analysis** — pipe the same events to **PostHog** (generous free
   tier, RN + Node SDKs) for funnels/retention, or GrowthBook for experiment
   readouts. Tag events with the user's flag assignments so you can compare
   variants.

### Guardrail discipline

Every engagement flag should have a **guardrail** before ramping past ~50%:
e.g. `reactions` must lift engagement **without** dropping posts-per-user. Wire the
guardrail metric into the same dashboard and treat a guardrail regression as a
rollout blocker (revert via `enabled:false`).

---

## 3. Current flag registry

| Flag | Gates | Default |
|---|---|---|
| `reactions` | reaction picker on posts | 100% |
| `repost_quote` | quote-repost composer | 100% (registry only) |
| `endorsements` | profile skill endorsements | 100% |
| `mastery_tree` | subject mastery tree | 100% |
| `streak_leaderboard` | scoped streak leaderboards | 100% |
| `streak_ring` | feed-header streak chip | 100% |
| `profile_strength` | strength meter (registry only) | 100% |
| `weekly_digest` | digest (registry only) | 100% |
| `public_profile` | public profile share (registry only) | 100% |

"registry only" = flag exists and resolves, but no client gate is wired yet — add
`useFeatureFlag('<key>')` at the render site when you want to control it.
