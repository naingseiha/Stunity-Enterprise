# Stunity v2 — Implementation Roadmap

**Companion to:** `docs/STUNITY_v2_GROWTH_PLAN.md` (the *why*) and `docs/stunity-vision/DAILY_ENGAGEMENT_AND_SCALE.md` (the strategy).
**This document is the *how*** — a sequenced, file-grounded engineering plan for the six daily-use hooks and the scale work.

**Status legend:** ✅ done · 🟡 partial / started · 🔴 not started · 🐞 has a known bug to fix first

---

## 0. Current state — what's already in the working tree

Sprint 1-2 backend was started. The uncommitted changes (as of this roadmap) implement the **backbone of Identity + Streak**, but several pieces are partial or buggy. This is the precise inventory so nothing gets lost or double-built.

| Feature | Layer | File(s) | State |
|---|---|---|---|
| `username` field + unique index | schema | `packages/database/prisma/schema.prisma:583` | ✅ |
| `VerificationRequest` model | schema | `packages/database/prisma/schema.prisma:4344` | ✅ |
| Username read on `/users/me` | auth-service | `services/auth-service/src/index.ts:2154` | ✅ |
| `PUT /users/me/username` (claim/change) | auth-service | `services/auth-service/src/index.ts:2190` | ✅ |
| `POST /users/me/verification-request` | auth-service | `services/auth-service/src/index.ts:2664` | ✅ |
| Username backfill script | auth-service | `services/auth-service/src/scripts/generateUsernames.ts` | ✅ one-shot |
| `GET /public/u/:username` (no-auth) | feed-service | `services/feed-service/src/routes/profile.routes.ts:195` | 🟡 |
| `GET /profile/strength` + nudge | feed-service | `services/feed-service/src/routes/profile.routes.ts:243` | 🟡 |
| Admin verification queue (list/approve/reject) | school-service | `services/school-service/src/index.ts:1754` | ✅ |
| XP curve smoothing (`100 + (lvl-1)*50`) | analytics-service | `services/analytics-service/src/index.ts:705` | ✅ |
| Sync `User.level`/`totalPoints` on attempt | analytics-service | `services/analytics-service/src/index.ts:1157` | ✅ |
| Level recalc backfill script | analytics-service | `services/analytics-service/src/scripts/recalculateLevels.ts` | ✅ one-shot |
| Streak-freeze *earning* logic | analytics-service | `services/analytics-service/src/index.ts:1816` | 🐞 |
| Streak-at-risk push job | notification-service | `services/notification-service/src/jobs/streakAtRiskJob.ts` | ✅ |
| Weekly progress digest job | notification-service | `services/notification-service/src/jobs/weeklyProgressDigestJob.ts` | 🟡 |
| Job HTTP triggers (`/jobs/*`, service-auth) | notification-service | `services/notification-service/src/routes/notification.routes.ts:28` | ✅ |

**Mobile already has** (do NOT rebuild — wire to the new endpoints): `src/components/streak/StreakWidget.tsx`, `LearningStreakCard.tsx`, `src/services/streakReminders.ts`, `src/components/feed/TeacherVerifiedBadge.tsx`, `EdScoreBadge.tsx`, `MasterExplainerBadge.tsx`, the full `src/screens/profile/*` set, and `src/api/profileApi.ts`.

---

## 1. Bugs / gaps in the started work — fix these before building on top

These must be resolved first; later features depend on them being correct.

> **✅ RESOLVED (2026-06-01, backend-correctness slice).** All five items below were fixed and typecheck clean; freeze logic has 10 passing unit tests. The only remaining step is applying the DB migration + backfills (see §10) and the mobile UI work in §3. Items kept here for the record, annotated with what landed.

### 1.1 🐞 Streak-freeze logic is incoherent (P0)
**Where:** `services/analytics-service/src/index.ts:1816` and schema `LearningStreak`.

Three distinct problems:
1. **Schema/code mismatch.** Schema defaults `freezesTotal = 3`, `freezesUsed = 0`. The new code does `if (streak.freezesTotal < 1) freezeEarned = true` then `newFreezesTotal = freezeEarned ? 1 : streak.freezesTotal`. Because the default is already 3, the condition is *never* true → no freeze is ever earned, and the field is being treated as "freezes I've been awarded" while the schema treats it as "freezes available."
2. **Freezes are never spent.** The missed-day branch (`else { newCurrentStreak = 1 }`) resets unconditionally. A stored freeze should be *consumed* to bridge a single missed day before the streak resets.
3. **Plan says "max 1 stored," schema says 3. → DECIDED: 1 stored, earn per 7 days.** Implement a single `MAX_FREEZES_AVAILABLE = 1` constant. Earn one freeze per 7-day milestone *only if* `freezesAvailable < MAX_FREEZES_AVAILABLE`. Treat `freezesTotal` as lifetime granted and `freezesUsed` as consumed, so `freezesAvailable = freezesTotal - freezesUsed` and the cap is enforced on grant. (The schema `@default(3)` for `freezesTotal` should be reset to `0` via migration — current default would read as 3 already-granted.)

**Fix:** Define freeze semantics explicitly, implement earn **and** spend, and cover the gap-of-exactly-one-day case. See §3.2 for the target behavior. Add a unit test for: miss 1 day w/ freeze → streak preserved + `freezesUsed++`; miss 1 day w/o freeze → reset; miss 2+ days → reset regardless.

### 1.2 🟡 New users get no username (P0 for public profiles)
`PUT /users/me/username` and the backfill script exist, but **registration does not assign a username**. New signups land with `username = null`, so `stunity.app/u/{username}` is dead for them and `/public/u/:username` 404s.
**Fix:** Generate a username at registration in `auth-service` (reuse the `slugify` + collision-loop from `generateUsernames.ts` — extract it to a shared util `services/auth-service/src/utils/username.ts`). Run the backfill once for existing users.

### 1.3 🟡 `GET /profile/strength` writes on a read (P2)
The endpoint does `prisma.user.update({ profileCompleteness })` inside a GET. Side-effecting reads break caching and read-replica routing (the perf work moved reads to `prismaRead`). **Fix:** either (a) compute on read, persist via a fire-and-forget on the write pool only when the value changed, or (b) recompute `profileCompleteness` at profile-mutation time and make this endpoint pure-read. Prefer (b).

### 1.4 🟡 Weekly digest depends on `WeeklyLeaderboard` being populated (P1)
`weeklyProgressDigestJob.ts` finds "active users" via `WeeklyLeaderboard.weekStart >= 7d`. If no job populates `WeeklyLeaderboard` weekly, the digest silently sends to nobody. **Verify** a leaderboard-population job exists; if not, the digest's candidate query should fall back to `LearningStreak`/`LessonProgress` activity. Also: N+1 query shape (per-user `count` + `findUnique` + `findMany`) is fine at small scale but must be batched before 10k DAU.

### 1.5 🔴 No scheduler actually calls the `/jobs/*` endpoints (P1)
The jobs are exposed as service-auth HTTP endpoints (correct design for Cloud Run), but nothing triggers them. **Fix:** add Cloud Scheduler entries (streak-at-risk hourly within active windows; weekly-digest Sunday 18:00 local). Document in `infrastructure/`. Until then, no proactive notifications fire.

---

## 2. Architecture conventions (apply to every feature below)

- **Reads on `prismaRead`, writes on `prisma`.** The perf phase established this; honor it in all new routes.
- **Every new engagement feature ships behind a flag** (§6). No exceptions — the growth plan's whole thesis is "half these bets are wrong."
- **Notifications respect the hard cap of ≤3/user/day** non-urgent (anti-metric, §7). Route all new pushes through a single batching/quota layer in notification-service, not ad-hoc per job.
- **Idempotent writes** for all engagement actions (like/follow/endorse/check-in) — dedupe by natural key.
- **Instrument as you build.** Each feature lands with its success metric wired (§7), not as a follow-up.

---

## 3. Sprint 1-2 (Weeks 1-4) — Identity & Streak

### 3.1 Profile strength meter 🟡
**Backend:** mostly done (`/profile/strength`); apply fix §1.3.
**Mobile:**
- Duolingo-style ring on home/profile header consuming `/profile/strength`.
- Surface `nextAction` as a tappable nudge that deep-links to the relevant `EditProfileScreen` field.
- Hide nudge at 100%; convert to a "100% — all-star" flex badge.
**DoD:** ring renders from live data; tapping a nudge lands on the exact field; metric §7.2 (profile ≥80% within 7d) instrumented.

### 3.2 Streak ring + freeze mechanic 🐞→🟡
**Backend:** fix §1.1 first. Target behavior:
- Earn 1 freeze per 7-day milestone, available capped at 1.
- On exactly-one-missed-day with an available freeze: preserve streak, `freezesUsed++`, do **not** advance `currentStreak`.
- Expose `freezesAvailable = freezesTotal - freezesUsed` in `/streak/update` and a new `GET /streak` response.
**Mobile:** wire existing `StreakWidget.tsx` / `LearningStreakCard.tsx` to show ring state (gray→green), freeze count, and "what counts" sheet. Define "active" = one of: recall review, lesson section, post, or comment (low bar, per plan §3.2).
**Scoped leaderboards:** new endpoint `GET /streak/leaderboard?scope=class|club|school`. Reuse existing leaderboard infra; add streak as a sortable column.
**DoD:** freeze unit tests pass; ring on ≥1 primary screen header; leaderboard returns scoped results; metric §7.3 (% DAU completing a recall) instrumented.

### 3.3 Verified educator badges ✅→🟡
**Backend:** submit + admin queue done. **Add:** email-domain auto-verify path (school domain → auto-approve student tier; educator/institution still manual). Wire approval to fire a notification + unlock the badge across post/comment render.
**Mobile:** verification request entry point in Settings; consume `isVerified` in `TeacherVerifiedBadge.tsx` everywhere a user is rendered (profile, post header, comment). Admin approval UI in the web/admin panel (`apps/web`).
**DoD:** approve flow flips `isVerified`, sends notification, badge appears on profile + posts + comments.

### 3.4 Public profile URL 🟡
**Backend:** `/public/u/:username` exists; depends on §1.2 (username at signup). Add OG meta + a thin SSR/redirect route in `apps/web` so links unfurl and work logged-out.
**Mobile:** "Share my profile" → `stunity.app/u/{username}` from profile + `MyQRCardScreen.tsx`.
**DoD:** logged-out load renders portfolio; share sheet produces the URL; link unfurls with name/avatar.

### 3.5 Weekly progress digest 🟡 — **the §8 "ship ONE thing" priority**
**Backend:** job exists; apply fixes §1.4 (candidate fallback + batching) and §1.5 (scheduler). Add the in-app card payload (already writes a `Notification` with `link=/profile?tab=performance`).
**Mobile:** Sunday in-app digest card on home + `PerformanceTab.tsx`.
**DoD:** Cloud Scheduler fires Sunday; push + in-app card delivered to active users only; respects ≤3/day cap; open-rate tracked.

### 3.6 Expo Push foundation 🔴 (blocks all proactive notifications)
`DeviceToken` model + `expoPush.ts` exist, but **token registration on the client must be confirmed/built.**
**Mobile:** capture Expo push token on first launch + on app open (refresh), POST to a `deviceToken` upsert endpoint. Per-category opt-in screen (streak / follows / club / grades / assignments).
**Backend:** category preferences on `privacySettings.mobileApp`; the batching/quota layer (§2) reads these.
**DoD:** token stored on install; toggling a category suppresses that push category; quota cap enforced server-side.

---

## 4. Sprint 3-4 (Weeks 5-8) — Social proof & Progress

| Feature | Backend | Mobile | Notes |
|---|---|---|---|
| **Reactions** (like/insightful/celebrate/smart-take) | extend Post reaction model + endpoint; keep idempotent per (user,post) | reaction picker on post/comment | migration on existing `like` data |
| **Repost-with-quote** | new feed item type referencing source post + commentary | compose sheet | reuses feed rendering; acquisition lever |
| **Endorsements (context-anchored)** | model: (endorser, endorsee, skill, courseId/classId); one-tap; auto-suggest from shared course/class enrollment | nudge card + profile display | "You took Math 101 with Sok — endorse?" |
| **Subject mastery tree** | aggregate existing recall (SM-2) + quiz performance → per-topic 0-100%; new read endpoint | tree view per enrolled subject | data already exists; this is mostly read-modeling + UI |
| **Notification aggregation by relationship** | group by role/relationship in notification-service render, not raw count | updated notification rows | "Mr. Sok and 4 teachers liked…" |
| **GrowthBook integration** | SDK in services + flag eval middleware | RN SDK + flag gating | wrap §3 features retroactively |

**Sequencing:** GrowthBook lands first in this block so reactions/endorsements ship flagged from day one.

---

## 5. Sprint 5-6 (Weeks 9-12) — Belonging & real-world scale

### Belonging
- **Club study rooms** — text chat + presence first (voice deferred). Reuse existing Supabase realtime + WebSocket + Redis pub/sub. New: room channel per club, presence counter ("3 studying now").
- **Mentorship matching MVP** — opt-in flags for teachers + senior students; suggest top-3 by subject + class + schedule overlap; one-tap intro message via messaging-service.

### Scale (from DAILY_ENGAGEMENT_AND_SCALE §5)
| Item | Action | Owner area |
|---|---|---|
| **CDN + media variants** | Cloudflare CDN in front of R2; hashed immutable URLs; generate `?w=320,640,1280` on upload | storage-service |
| **Video ABR** | HLS 480/720/1080 via transcoding queue (Mux/CF Stream/ffmpeg) | storage-service + worker |
| **Structured logging** | replace `console.log('[Reels MISS]…')` with `pino` JSON → Axiom | all services |
| **OpenTelemetry tracing** | `traceparent` mobile→gateway→service across feed/learn/club; promote existing `Server-Timing` | feed, learn, club |
| **Circuit breakers** | mobile API client: 3 timeouts/60s → short-circuit 60s, serve disk cache (builds on perf-phase cache) | apps/mobile |
| **Lite-ranker degradation** | 50%-fewer-pool-queries mode under load; extend existing fallback | feed-service |
| **Read-replica audit** | confirm all read paths on `prismaRead`; set `DATABASE_READ_URL`; tighten primary pool | all services |
| **Redis ranker cache** | cache school-shared pools by `school:trending:1h-bucket` | feed-service |

---

## 6. Feature-flag plan (GrowthBook/PostHog)

Every feature in §3-5 ships behind a flag, rolled 10% → 50% → 100% with guardrail metrics:
`streak_ring`, `streak_freeze`, `profile_strength_meter`, `weekly_digest`, `verified_badges`, `public_profile`, `reactions`, `repost_quote`, `endorsements`, `mastery_tree`, `club_study_rooms`, `mentorship_match`.
**Guardrail:** any feature that lifts DAU but drops posts-per-user or content quality is not a win — track both sides.

---

## 7. Metrics to wire (instrument *with* each feature, not after)

| Metric | Definition | Target | Instrument in |
|---|---|---|---|
| **North star — WAD/MAU** | weekly active days / MAU | 4.5 @ 90d | analytics-service rollup |
| **Profile ≥80% in 7d** | % new users | 60%+ | profile-strength events (§3.1) |
| **% DAU w/ ≥1 recall review** | engagement loop | 40%+ | recall review events (§3.2) |
| **Notifications/user/day** (anti-metric) | non-urgent sends | ≤3 | the batching layer (§2/§3.6) |

---

## 8. Dependency graph & recommended execution order

```
§1.2 username@signup ──► §3.4 public profile
§1.1 freeze fix ───────► §3.2 streak ring/leaderboard
§3.6 Expo Push ────────► §3.5 digest push, §3.2 streak-at-risk push  (all proactive notifs)
§1.5 scheduler ────────► §3.5 digest, streak-at-risk firing
§2 batching/quota ─────► every push feature  (enforces anti-metric)
§4 GrowthBook ─────────► gates §3 retroactively + all of §4-5
```

**Critical path for the §8 "one thing" (weekly digest):** §3.6 Expo Push token registration → §1.4 candidate fallback + batching → §1.5 scheduler → in-app card UI. Everything else can parallelize.

**Suggested first PR slice (1 sprint, all backend-correctness):**
1. Fix freeze logic + tests (§1.1)
2. Username at signup + backfill (§1.2)
3. Make `/profile/strength` pure-read (§1.3)
4. Digest candidate fallback + scheduler wiring (§1.4, §1.5)
5. Confirm/finish Expo token registration (§3.6 backend)

That slice makes the *already-written* code actually correct and live, then the mobile UI work in §3 has solid endpoints to build against.

---

## 9. What we are explicitly NOT building (guardrail against scope creep)

Per growth-plan §6: **no** job board, **no** live video classes (until a club organically runs 20+ weekly events), **no** web consumer app (mobile-first), **no** AI chatbot surface (use AI to enhance recall ranking/moderation instead), **no** monetization/paywall before DAU justifies it. First monetization, when it comes, is B2B school licensing.

---

---

## 10. Deployment steps for the backend-correctness slice (2026-06-01)

The code is merged and typechecks; these steps touch the real database and must be run deliberately.

```sh
# 1. Migration — captures username, VerificationRequest, and freezesTotal default 3->0
cd packages/database
npx prisma migrate dev --name v2_identity_streak     # dev; use `migrate deploy` in prod CI

# 2. Backfills (one-shot, idempotent)
npx ts-node ../../services/auth-service/src/scripts/generateUsernames.ts      # usernames for existing users
npx ts-node ../../services/analytics-service/src/scripts/recalculateLevels.ts # re-level under the new XP curve
npx ts-node ../../services/analytics-service/src/scripts/clampStreakFreezes.ts # clamp legacy 3-freeze users to 1
```

Scheduler: the in-process scheduler runs automatically; set `ENABLE_INTERNAL_CRON=false` and configure Cloud Scheduler in production (see `infrastructure/cloud-scheduler/notification-jobs.md`).

**What landed in this slice:**
- `computeStreakTransition` (pure, tested) — earn/spend freezes correctly, cap 1.
- Username at all 3 registration paths (shared `auth-service/src/utils/username.ts`).
- `/profile/strength` is pure-read (write-back only on drift); logic in `feed-service/src/utils/profileStrength.ts`.
- Weekly digest sources candidates + XP from real activity tables (not the empty `WeeklyLeaderboard`).
- Shared push quota (`pushQuota.ts`, ≤3/day) + per-category opt-in (`pushPreferences.ts` + app-settings keys) honored by both jobs.
- Internal scheduler + Cloud Scheduler doc. Expo token registration confirmed already working.

**Next (not in this slice):** mobile UI — streak ring, profile-strength ring, push-category opt-in screen, Sunday digest card, public-profile share — then Sprint 3-4 features.

---

*Living document. Strike through what ships; record what the A/B tests teach. Review at each sprint boundary.*
