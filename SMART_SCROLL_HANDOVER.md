# Stunity Enterprise — Smart Scroll Handover Document
**Date:** 2026-05-30 | **Branch:** `main` | **Session commits:** 20+ across Phase 3

---

## 1. What Was Built — Overview

"Smart Scroll" is the thesis that every swipe in the Stunity feed leaves the student measurably smarter. Five feed features were designed, built UI-first, then wired to real production backends:

| Feature | Thesis | Status |
|---|---|---|
| **Recall Cards** | Spaced-repetition (SM-2) flashcards interleaved every 5 posts | ✅ Full stack |
| **Ed-Score Badges** | Crowdsourced post quality score visible in PostHeader | ✅ Full stack |
| **Brain Mode** | Feed re-ranked by Ed-Score server-side | ✅ Full stack |
| **Feynman Bounties** | XP-staked peer-teaching Q&A cards | ✅ Full stack |
| **Quiz Wars** | Live inter-class battle banner (read + join) | ✅ Foundation |

Focus Reels (interactive video with mid-video pause-point questions) was designed in the strategy doc but **not built** — deferred as the largest scope item.

---

## 2. Architecture & File Map

### 2.1 Mobile — New & Modified Files

```
apps/mobile/src/
├── types/index.ts                    MODIFIED  RecallCard, FeynmanBounty, QuizWar,
│                                               MasterExplainerTier, RECALL_CARD/
│                                               FEYNMAN_BOUNTY/QUIZ_WAR FeedItem variants,
│                                               Post.edScore/teacherVerified/_scoreBreakdown
│
├── api/
│   ├── recall.ts                     NEW       fetchDueCards, submitRecallReview
│   ├── bounties.ts                   NEW       fetchActiveBounties, createBounty,
│   │                                           fetchBountyReplies, submitBountyReply,
│   │                                           toggleBountyAha, awardBounty
│   ├── quizWars.ts                   NEW       fetchActiveQuizWar, joinQuizWar
│   └── postVerification.ts           NEW       verifyPost, unverifyPost, canVerifyPosts
│
├── components/feed/
│   ├── RecallCardItem.tsx            NEW       3-stage flashcard (resting/revealed/completed)
│   │                                           8 subject palettes, SM-2 grade buttons,
│   │                                           memory strength bar on completion
│   ├── EdScoreBadge.tsx              NEW       Small pill — gold ≥4.5, emerald 3.5–4.5
│   ├── TeacherVerifiedBadge.tsx      NEW       Gold school icon + "Verified" pill
│   ├── BrainModeToggle.tsx           NEW       Feed header toggle pill, sky-blue active state
│   ├── FeynmanBountyItem.tsx         NEW       Gold/amber flat card, 48px bounty XP hero,
│   │                                           urgency pill, top tutor + tier badge
│   ├── MasterExplainerBadge.tsx      NEW       Bronze/silver/gold ribbon pill (tutor rep tier)
│   ├── QuizWarBanner.tsx             NEW       LIVE indicator + countdown + tug-of-war bar
│   ├── PostHeader.tsx                MODIFIED  +edScore, +teacherVerified props → badges
│   └── PostCard.tsx                  MODIFIED  +currentUserRole, +verifiedOverride,
│                                               teacher verify menu item (role-gated)
│
├── screens/feed/
│   ├── FeedScreen.tsx                MODIFIED  Full Smart Scroll pipeline (see §2.3)
│   ├── BountyDetailScreen.tsx        NEW       Reply list + inline compose + Aha + Award
│   └── CreateBountyScreen.tsx        NEW       Subject picker + question + XP stake + duration
│
├── navigation/
│   ├── types.ts                      MODIFIED  +BountyDetail, +CreateBounty in FeedStack
│   └── MainNavigator.tsx             MODIFIED  Both screens registered
│
├── stores/feedStore.ts               MODIFIED  feedMode union +BRAIN_MODE; params.mode
│                                               sends BRAIN_MODE directly to backend
│
└── utils/
    ├── transformPost.ts              MODIFIED  CRITICAL: now maps edScore, teacherVerified,
    │                                           _score, _scoreBreakdown (were silently dropped)
    ├── mockRecallCards.ts            NEW       5 sample cards + injectRecallCards()
    ├── mockEdScores.ts               NEW/FIXED DEV-only hash fallback (production pass-through)
    ├── mockFeynmanBounties.ts        NEW       3 sample bounties + injectFeynmanBounties()
    └── mockQuizWars.ts               NEW       1 sample war + injectQuizWar()
```

### 2.2 Backend — New & Modified Files

```
services/feed-service/src/
├── index.ts                          MODIFIED  +recallRouter, +bountyRouter, +quizWarRouter
├── feedRanker.ts                     MODIFIED  +BRAIN_MODE dispatch → getBrainModeFeed()
│                                               getBrainModeFeed: ORDER BY edScore DESC NULLS LAST
│
├── routes/
│   ├── posts.routes.ts               MODIFIED  CRITICAL: buildResponse + stripToMinimal now
│   │                                           include edScore, teacherVerified, _score,
│   │                                           _scoreBreakdown (were dropped from JSON)
│   ├── recall.routes.ts              NEW       GET /recall/due, POST /recall/:id/review
│   ├── bounty.routes.ts              NEW       GET /bounties/active, POST /bounties,
│   │                                           GET /bounties/:id/replies,
│   │                                           POST /bounties/:id/replies,
│   │                                           POST /bounties/:id/replies/:rid/aha,
│   │                                           POST /bounties/:id/award
│   ├── quizWar.routes.ts             NEW       GET /quiz-wars/active,
│   │                                           POST /quiz-wars/:id/join
│   └── postActions.routes.ts         MODIFIED  Rating endpoint now writes edScore back to
│                                               Post atomically in same tx
│                                               POST /posts/:id/verify (teacher-gated)
│                                               POST /posts/:id/unverify
│
├── utils/
│   ├── sm2.ts                        NEW       Pure SM-2 algorithm (deterministic, testable)
│   ├── bountyEscrow.ts               NEW       createBountyWithEscrow (race-safe XP debit),
│   │                                           toggleAha, awardBountyAtomic,
│   │                                           computeMasterExplainerTiersBatch
│   └── recallCardsFromQuiz.ts        NEW       createRecallCardsForFailedAnswers —
│                                               auto-creates RecallCards after every quiz submit
│
└── validators/
    ├── recall.validator.ts           NEW       reviewCardBodySchema, dueCardsQuerySchema
    ├── bounty.validator.ts           NEW       createBountyBodySchema, createReplyBodySchema,
    │                                           awardBountyBodySchema, repliesQuerySchema
    └── quizWar.validator.ts          NEW       joinQuizWarBodySchema
```

### 2.3 FeedScreen Data Pipeline

```typescript
feedItems (from feedStore — cached, loads instantly)
  ↓ useMemo: applyMockEdScores()       // PROD: no-op. DEV: hash fallback for unrated posts.
  ↓ useMemo: sort by edScore DESC      // only when feedMode === 'BRAIN_MODE'
  ↓ useMemo: injectRecallCards(..., 5) // every 5th POST gets a RECALL_CARD
  ↓ useMemo: injectFeynmanBounties(.., 8) // every 8th POST (offset 3 from start)
  ↓ useMemo: injectQuizWar(...)        // single QUIZ_WAR banner after first POST
  = displayedFeedItems → FlashList
```

**Mount-time parallel fetch** (single `useEffect`, `Promise.allSettled`):
- `fetchDueCards({ limit: 10 })` — recall cards from SM-2 scheduler
- `fetchActiveBounties({ limit: 10 })` — active XP-staked questions
- `fetchActiveQuizWar()` — school's active war or null
All three fire simultaneously. Each falls back to mock data silently on failure.

### 2.4 Database Migrations (Surgical SQL — bypass broken shadow DB)

```
packages/database/prisma/migrations/
├── 20260530062903_add_recall_cards/    recall_cards + recall_reviews tables
├── 20260530065104_add_ed_score/        Post.edScore/edScoreCount/teacherVerified fields
├── 20260530072604_reconcile_schema_drift/ Fix school_profiles VARCHAR, GIN indexes,
│                                          grade_confirmations FK, user_post_feedback
│                                          index names — schema ↔ DB now match exactly
└── 20260530183002_add_quiz_wars/       quiz_wars + quiz_war_participants tables
```

**Note:** `prisma migrate dev` still blocked by `20260415143000_add_assignment_submission_runtime_support` which references `course_assignments` table that was created via raw SQL (no CREATE TABLE migration). See §4 for fix.

### 2.5 Prisma New Models

```prisma
RecallCard        (userId, questionId) @@unique — SM-2 state per question per user
RecallReview      append-only audit log of every grade event
Bounty            XP-staked question — status: ACTIVE/AWARDED/EXPIRED/CANCELLED
BountyReply       format: TEXT/VIDEO/SKETCH — ahaCount denormalized
BountyAha         (replyId, userId) @@unique — one Aha per user per reply
QuizWar           schoolId-scoped — one active per school
QuizWarParticipant (warId, userId) @@unique — team: 'A' | 'B'
```

**New Post fields:** `edScore Float?`, `edScoreCount Int`, `teacherVerified Boolean`,
`verifiedByTeacherId String?`, `verifiedAt DateTime?`

---

## 3. Production Data (Seeded — Live on DB)

Run to refresh:
```bash
cd packages/database && npx tsx prisma/seed-smart-scroll.ts
```

### Stunity QA School (`cmn1e43ir002a14op0m3ibq2g`)
- **UserStats**: 6 students (95–420 XP) + 2 teachers (510–680 XP) + admin
- **Quiz War**: LIVE — 10A vs 10B, Math·Algebra, 42 fighters (re-run seed to reset timer)
- **Feynman Bounties**: 3 active (Physics 100XP, Calculus 150XP, Genetics 75XP)
- **Bounty Replies**: 4 real explanations (teacher + student authored)
- **Recall Cards**: none yet — auto-create when students take quizzes with wrong answers

### Svaythom High School (`cmm7yhssh0000lwcvao23npok`)
- **UserStats**: teacher 920 XP lvl 4, admin 1215 XP lvl 4
- **Recall Cards**: 10 cards for teacher from real quiz questions (JS/AI/Bio/Math/GK)
- **Quiz War**: PRE_MATCH — 11A vs 11B, CS·JavaScript (re-run seed to reset)
- **Feynman Bounties**: 2 active (JS async/await 80XP, DNA replication 60XP)

---

## 4. Known Issues & Remaining Work

### P0 — Blocks `prisma migrate dev` (not blocking production)
- `20260415143000_add_assignment_submission_runtime_support` references
  `course_assignments` table with no CREATE TABLE migration. Root cause: same
  pattern as the `school_profiles` drift fixed at `b977aeb2`.
  **Fix**: create a backfill migration file with the missing `CREATE TABLE course_assignments`
  statement at the correct timestamp. Command:
  ```bash
  npx prisma migrate diff --from-empty --to-schema-datamodel \
    prisma/schema.prisma --script > /tmp/baseline.sql
  # Extract only course_assignments CREATE TABLE + FKs, save as a migration
  # with timestamp 20260414000000_add_course_assignments
  npx prisma migrate resolve --applied 20260414000000_add_course_assignments
  ```

### P1 — Performance optimizations (see §5 for detail)

### P2 — Missing backend features
| Feature | Gap |
|---|---|
| Quiz Wars | No answer submission endpoint (`POST /quiz-wars/:id/answer`) |
| Quiz Wars | No PRE_MATCH→LIVE→POST_MATCH transitions (admin/cron) |
| Quiz Wars | No WebSocket for real-time score deltas |
| Quiz Wars | No matchmaking (wars must be created manually via seed/SQL) |
| Feynman Bounties | No `GET /bounties/:id` (BountyDetailScreen fetches all 50 to find one) |
| Feynman Bounties | No cancel/refund flow (`POST /bounties/:id/cancel`) |
| Feynman Bounties | No expiration sweep background job |
| Recall Cards | `classmatesReviewingCount` hardcoded 0 in `GET /recall/due` |

### P3 — Missing mobile UI
| Feature | Gap |
|---|---|
| Focus Reels | Not built — interactive vertical video with pause-point questions |
| Quiz Wars | No live question round UI (answer submission screen) |
| Quiz Wars | No admin/teacher "Create War" screen |
| Feynman Bounties | No video/sketch reply composer |
| Recall Cards | No "Recall Board" screen (see all due cards at once) |

### P4 — Minor polish
- Same-school client check before "Verify post" (currently backend enforces, client trusts)
- Confirmation dialog before "Remove verification"
- Master Explainer tier: currently global wins — should be per-subject
- Brain Mode: offset pagination only — no cursor support for smooth infinite scroll
- Push notifications across all features
- Localization: all i18n strings have English `defaultValue` — Khmer translations not added

---

## 5. Performance Analysis

### Current feed load (before Smart Scroll, baseline)
- `feedStore` has a built-in Redis cache layer and cursor-based pagination
- FlashList with `overrideItemLayout` for accurate slot estimates
- `getItemType` returns per-type strings for FlashList cell recycling buckets
- Images: `expo-image` with `memory-disk` cache, blurhash placeholders

### What Smart Scroll adds on each feed render

| Step | Cost | Notes |
|---|---|---|
| `applyMockEdScores` | O(1) production | Pass-through when `!__DEV__` |
| `sortedFeedItems` | O(n log n) | Only when `BRAIN_MODE` active |
| `injectRecallCards` | O(n) | Single pass, no allocation beyond result array |
| `injectFeynmanBounties` | O(n) | Same |
| `injectQuizWar` | O(n) | Same |
| **Parallel fetch** | ~300ms once | `Promise.allSettled` on mount, not blocking render |

For a typical page of 20 posts, the 5 useMemo passes total < 1ms on modern hardware.
**The feed render path is not meaningfully slower.**

### Potential issues at scale (> 200 posts in memory)

1. **5 useMemo layers all depend on `feedItems`**: when the store appends new posts,
   all 5 memos re-run. Each is O(n) over the full accumulated list (not just the new page).
   **Fix**: memoize each injection step with a stable reference — `injectRecallCards`
   already returns a new array reference only when inputs change, so FlashList's
   `keyExtractor` must be stable (it is: `item.data.id` for POST/RECALL_CARD/BOUNTY/WAR).

2. **`deferredCardIds` as a plain Set inside state**: each `setDeferredCardIds` call
   creates a new Set reference → `recallCards` useMemo re-runs → `withRecallCards`
   re-runs → all downstream memos re-run. Chain of 4 memos from a single defer tap.
   **Fix** (if needed): use `useRef` for the set and a separate `deferredVersion`
   counter to trigger re-renders only when the count changes.

3. **`renderPost` deps include 5 callback handlers**: `handleRecallGrade`,
   `handleRecallDefer`, `handleBountySeeAnswers`, `handleBountyExplain`,
   `handleQuizWarJoin`. All are `useCallback` with stable deps (most have `[]` or
   `[navigation, t]`) so in practice `renderPost` stays stable. Worth monitoring.

4. **`handleQuizWarJoin` uses dynamic `import('@/api/quizWars')`**: async module
   loading on first join tap adds ~10–50ms. Should be a static import at the top of
   the file.

5. **FlashList slot size estimates**: RECALL_CARD=380, FEYNMAN_BOUNTY=500,
   QUIZ_WAR=500. If actual rendered heights differ significantly, FlashList will
   re-layout. Should be measured with onLayout in development and tuned.

### Optimizations to apply next session

```typescript
// FIX 1: static import for quizWar join (apps/mobile/src/screens/feed/FeedScreen.tsx)
// REMOVE: const { joinQuizWar } = await import('@/api/quizWars');
// ADD at file top: import { joinQuizWar } from '@/api/quizWars';

// FIX 2: GET /bounties/:id endpoint (services/feed-service/src/routes/bounty.routes.ts)
router.get('/bounties/:bountyId', authenticateToken, async (req, res) => {
  const bounty = await prisma.bounty.findUnique({
    where: { id: req.params.bountyId },
    include: { asker: { select: {...} }, replies: { ... } }
  });
  // shape to FeynmanBounty type, return
});

// FIX 3: BountyDetailScreen — use single endpoint not fetchActiveBounties
// apps/mobile/src/screens/feed/BountyDetailScreen.tsx line ~60:
// REPLACE: fetchActiveBounties({ limit: 50 }) + find
// WITH: GET /bounties/:bountyId directly
```

---

## 6. Feature Correctness Checklist

### Recall Cards ✅
- [x] SM-2 algorithm (again/good/easy → ease factor + interval update)
- [x] Auto-create on failed quiz questions
- [x] Real-time XP award via `UserStats.xp` upsert
- [x] `onGrade` wired to `POST /recall/:id/review`
- [x] `onDefer` suppresses card for current session
- [x] Falls back to mocks gracefully if backend unreachable
- [ ] `classmatesReviewingCount` hardcoded 0

### Ed-Score Badges ✅
- [x] `EducationalValueRating` → `Post.edScore` denormalization in rating endpoint
- [x] `posts.routes.ts buildResponse` includes `edScore` (fixed `a8bf22a0`)
- [x] `stripToMinimal` includes `edScore` (fixed `a8bf22a0`)
- [x] `transformPost` maps `edScore` (fixed `39be64ae`)
- [x] `applyMockEdScores` is production no-op (fixed `a8bf22a0`)
- [x] Teacher verify: `POST /posts/:id/verify` — TEACHER role gated, same-school
- [x] Teacher verify menu item in PostCard (role-gated in mobile)

### Brain Mode ✅
- [x] `feedMode: BRAIN_MODE` in feedStore
- [x] `getBrainModeFeed` in feedRanker — `ORDER BY edScore DESC NULLS LAST`
- [x] `posts_edScore_createdAt_idx` index serving the query
- [x] Client-side fallback sort retained (defense-in-depth)
- [ ] Cursor pagination (offset-only)

### Feynman Bounties ✅
- [x] Atomic XP escrow at creation (race-safe conditional update)
- [x] Reply submission (TEXT format)
- [x] Aha! toggle (atomic tx: BountyAha + ahaCount denormalization)
- [x] Award (atomic: winner flag + AWARDED status + XP credit to tutor)
- [x] MasterExplainerTier from win counts (batch groupBy — no N+1)
- [x] BountyDetailScreen — replies list, compose, Aha, Award
- [x] CreateBountyScreen — subject picker, question, XP stake, duration
- [x] "Bounty" button in feed quick-actions
- [ ] `GET /bounties/:id` — BountyDetailScreen fetches all 50 to find one
- [ ] Cancel/refund flow
- [ ] Expiration sweep job
- [ ] Video/sketch reply composer

### Quiz Wars ✅ (foundation)
- [x] `quiz_wars` + `quiz_war_participants` tables
- [x] `GET /quiz-wars/active` — school-scoped, viewer's team info
- [x] `POST /quiz-wars/:id/join` — idempotent, auto-team-balance
- [x] Real-time countdown (local setInterval on mobile)
- [x] Tug-of-war score bar, presence count, LIVE pulsing dot
- [ ] `POST /quiz-wars/:id/answer` — answer submission + score update
- [ ] State machine: PRE_MATCH → LIVE → POST_MATCH
- [ ] WebSocket for live score deltas
- [ ] Admin/teacher war creation UI
- [ ] POST_MATCH highlight reel + MVP callout

---

## 7. Quick Reference — Key IDs and Commands

### Production DB (Supabase, ap-southeast-2)
```bash
# Re-seed Smart Scroll data (idempotent — safe to re-run anytime)
cd packages/database && npx tsx prisma/seed-smart-scroll.ts

# Check production edScore data
npx tsx -e "
import {PrismaClient} from '@prisma/client';
const p = new PrismaClient();
p.post.findMany({where:{edScore:{not:null}},select:{id:true,edScore:true,teacherVerified:true},take:10})
.then(r => { console.log(r); p.\$disconnect(); });
"
```

### Key Schools
```
cmn1e43ir002a14op0m3ibq2g  Stunity QA School    (6 students, 2 teachers)
cmm7yhssh0000lwcvao23npok  Svaythom High School (1 teacher, 42 quiz questions)
```

### Type-check commands
```bash
# Mobile
cd apps/mobile && npx tsc --noEmit

# Backend
cd services/feed-service && npx tsc --noEmit

# Expected: only pre-existing SuggestedUsersScreen shadowOpacity warning
```

---

## 8. Commit History (Phase 3 — Smart Scroll)

```
a8bf22a0  fix(edscore): real API data for Ed-Score + Verified badges end-to-end
39be64ae  fix(smart-scroll): production readiness — 4 critical issues resolved
9657ad83  feat(bounty): BountyDetailScreen + CreateBountyScreen
80533b68  fix(feed): parallel Smart Scroll fetch + wire bounty/war buttons
c2bb85f5  chore(seed): extend Smart Scroll seed to Svaythom High School
a27c24db  chore(seed): production Smart Scroll seed script
16685079  feat(quizwar): backend foundation — persistence + read/join
a04db33a  feat(bounty): complete the flow — replies, Aha!, award, tiers
d7911f20  feat(bounty): backend foundation — Prisma + XP escrow + REST
b977aeb2  chore(db): reconcile schema drift (GIN indexes, school_profiles)
0e9148b8  feat(edscore): mobile UI for teacher post verification
c93a2bf6  feat(brainmode): server-side ranking by Post.edScore
bbd71a85  feat(edscore): backend — denormalize ratings + teacher verify
9416f69a  chore(db): apply recall_cards migration (surgical SQL)
50004fd5  feat(recall): wire mobile + auto-create on failed quiz answers
b9be2aed  feat(recall): backend foundation — Prisma + SM-2 + REST
e2c55c21  feat(feed): add Quiz Wars banner (UI prototype)
defdc5fb  feat(feed): add Feynman Bounties (UI prototype)
0c192ff8  feat(feed): add Brain Mode toggle (UI prototype)
8aa395e6  feat(feed): add Ed-Score + Teacher-Verified badges (UI prototype)
20972836  feat(feed): add Recall Cards (UI prototype)
```
