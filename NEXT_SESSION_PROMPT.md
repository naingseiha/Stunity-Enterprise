# Stunity Enterprise — Smart Scroll: New Session Brief

You are continuing development of the **Stunity Enterprise** React Native (Expo) + Express.js
monorepo. This prompt is self-contained — read it fully before touching any file.

---

## Project Location
```
/Users/naingseiha/Documents/projects/Stunity-Enterprise
```

## Tech Stack
- **Mobile**: React Native (Expo), FlashList, Reanimated 3, React Navigation, Zustand, i18next
- **Backend**: Express.js microservices at `services/feed-service/`
- **Database**: PostgreSQL (Supabase ap-southeast-2) + Prisma 5.22
- **Design tokens**: `apps/mobile/src/config/theme.ts` — sky-blue primary `#0EA5E9`, 8pt grid
- **Component family**: `Card`, `Avatar`, `PostSkeleton` from `apps/mobile/src/components/common/`

---

## What Was Built Last Session — "Smart Scroll"

Five feed features to make every scroll session measurably educational:

### 1. Recall Cards (`20972836` → `50004fd5` → `9416f69a`)
**What**: SM-2 spaced-repetition flashcards interleaved every 5 posts in the feed.
**Backend**: `recall_cards` + `recall_reviews` Prisma models. SM-2 algorithm at
`services/feed-service/src/utils/sm2.ts`. Endpoints: `GET /recall/due`,
`POST /recall/:id/review`. Auto-create hook in `quiz.routes.ts:478` creates recall cards
from every wrong quiz answer automatically.
**Mobile**: `RecallCardItem.tsx` (3 stages: resting/revealed/completed, memory strength bar).
`apps/mobile/src/api/recall.ts`. `handleRecallGrade` in FeedScreen calls real API.
`onDefer` hides card for current session via `deferredCardIds` Set.

### 2. Ed-Score Badges (`8aa395e6` → `bbd71a85` → `a8bf22a0`)
**What**: Star rating pill (★ 4.2) + 🎓 Verified badge on post author row.
**Backend**: `Post.edScore` is denormalized from `EducationalValueRating.averageRating`
inside the rating endpoint transaction (`postActions.routes.ts`). Teacher verify endpoints:
`POST /posts/:id/verify` and `/unverify` — TEACHER role + same-school gated.
**Mobile**: `EdScoreBadge.tsx` + `TeacherVerifiedBadge.tsx` in `PostHeader.tsx`.
`PostCard.tsx` reads `currentUserRole` from auth store and shows verify option in `•••` menu.
**CRITICAL BUG FIXED**: `posts.routes.ts buildResponse` and `stripToMinimal` now explicitly
include `edScore`, `teacherVerified`, `_score`, `_scoreBreakdown`. `transformPost.ts` maps
them. `applyMockEdScores` is a no-op in production (`!__DEV__`).

### 3. Brain Mode (`0c192ff8` → `c93a2bf6`)
**What**: Feed toggle pill that re-ranks by Ed-Score server-side.
**Backend**: `feedRanker.generateFeed` dispatches mode=BRAIN_MODE to `getBrainModeFeed()`
which runs `ORDER BY edScore DESC NULLS LAST, createdAt DESC` using the
`posts_edScore_createdAt_idx` index.
**Mobile**: `BrainModeToggle.tsx` in feed header. `feedMode: BRAIN_MODE` in `feedStore.ts`.

### 4. Feynman Bounties (`defdc5fb` → `d7911f20` → `a04db33a` → `9657ad83`)
**What**: XP-staked Q&A cards — asker stakes XP, tutors compete, winner gets the bounty.
**Backend**: `Bounty`, `BountyReply`, `BountyAha` models. Full CRUD:
`GET /bounties/active`, `POST /bounties` (atomic XP escrow via conditional update),
`GET /bounties/:bountyId/replies`, `POST /bounties/:bountyId/replies`,
`POST /bounties/:bountyId/replies/:rid/aha` (atomic toggle + ahaCount denorm),
`POST /bounties/:bountyId/award` (atomic XP transfer + winner flag).
`MasterExplainerTier` (bronze 10w / silver 50w / gold 200w) computed via groupBy.
**Mobile**: `FeynmanBountyItem.tsx` (feed card), `BountyDetailScreen.tsx` (replies + compose),
`CreateBountyScreen.tsx` (subject picker + XP stake + form). "Bounty" button in feed
quick-actions bar.

### 5. Quiz Wars (`e2c55c21` → `16685079`)
**What**: Live inter-class battle banner — LIVE dot, countdown, tug-of-war score bar.
**Backend**: `QuizWar` + `QuizWarParticipant` models. `GET /quiz-wars/active` (school-scoped,
viewer's team info). `POST /quiz-wars/:id/join` (idempotent, auto-assigns to lower-score team).
**Mobile**: `QuizWarBanner.tsx`. `handleQuizWarJoin` calls real API. Join auto-balances teams.

---

## Feed Data Pipeline (FeedScreen.tsx)

```typescript
feedItems (store, loads from Redis cache instantly — existing fast load preserved)
  ↓ applyMockEdScores()       // PROD: no-op. DEV: hash fallback for unrated posts
  ↓ sort by edScore DESC      // only when feedMode === 'BRAIN_MODE'
  ↓ injectRecallCards(…, 5)   // RECALL_CARD every 5th POST
  ↓ injectFeynmanBounties(…, 8) // FEYNMAN_BOUNTY every 8th POST (offset 3)
  ↓ injectQuizWar(…)          // single QUIZ_WAR after first POST
  ↓ FlashList (FlashList, overrideItemLayout tuned per type)
```

Mount: single `useEffect` with `Promise.allSettled([fetchDueCards, fetchActiveBounties,
fetchActiveQuizWar])` — all three fire simultaneously, main feed renders before they return.

---

## Production Data (Live on DB)

```bash
# Two real schools:
cmn1e43ir002a14op0m3ibq2g  # Stunity QA School — 6 students, 2 teachers
cmm7yhssh0000lwcvao23npok  # Svaythom High School — 1 teacher, 42 quiz Qs, 102 posts

# Re-seed Smart Scroll data (idempotent):
cd packages/database && npx tsx prisma/seed-smart-scroll.ts
```

---

## Known Bugs & Performance Issues to Fix

### MUST FIX (P1 — affects performance/correctness)

**1. Dynamic import in `handleQuizWarJoin` (FeedScreen.tsx ~line 478)**
```typescript
// BUG: async module loading on every join tap
const { joinQuizWar } = await import('@/api/quizWars');
// FIX: move to top of file as static import
import { joinQuizWar } from '@/api/quizWars';
```

**2. BountyDetailScreen fetches all 50 bounties to find one (BountyDetailScreen.tsx ~line 62)**
```typescript
// BUG: O(50) API call to find 1 bounty
const allBounties = await fetchActiveBounties({ limit: 50 });
const found = allBounties.find(b => b.id === bountyId);
// FIX: add GET /bounties/:id endpoint on backend, call it directly
```

**3. Fix old broken migration blocking `prisma migrate dev`**
`20260415143000_add_assignment_submission_runtime_support` references `course_assignments`
table that has no CREATE TABLE migration (same drift pattern as school_profiles).
```bash
# Check what the table looks like:
cd packages/database
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma --script | grep -A 30 "course_assignments"
# Create a backfill migration at timestamp 20260414000000_add_course_assignments
# Apply + resolve it
```

### SHOULD FIX (P2 — missing features)

**4. `classmatesReviewingCount` hardcoded 0**
In `services/feed-service/src/routes/recall.routes.ts` GET /recall/due response:
```typescript
classmatesReviewingCount: 0,  // TODO: count users who have same card due today
// FIX: add a groupBy query over recall_cards where questionId IN [...] AND nextReviewAt <= now
```

**5. Quiz War answer submission (game mechanics)**
Need: `POST /quiz-wars/:id/answer` (score++ for team), admin `POST /quiz-wars` creation,
state transitions PRE_MATCH → LIVE → POST_MATCH.

**6. Bounty `GET /bounties/:id` endpoint**
```typescript
// services/feed-service/src/routes/bounty.routes.ts
router.get('/bounties/:bountyId', authenticateToken, async (req, res) => {
  const bounty = await prisma.bounty.findUnique({
    where: { id: req.params.bountyId },
    include: { asker: { select: { id:true, firstName:true, lastName:true, profilePictureUrl:true } }, 
               replies: { select: { tutorId: true, ahaCount: true, tutor: { select: { id:true, firstName:true, lastName:true } } }, orderBy: { ahaCount: 'desc' } }
    }
  });
  // Shape to FeynmanBounty type + hoursLeftUntil + tutorsWorking
});
```

### NICE TO HAVE (P3)

- Focus Reels (interactive vertical video with mid-video pause-point questions) — not built yet
- Brain Mode cursor pagination (currently offset-only — fine for short sessions)
- Push notifications for bounty wins, recall overdue, quiz war start
- Per-subject MasterExplainer tiers (currently global win count)
- Localization: add Khmer translations to i18n bundle

---

## Performance Checklist (Run Before Shipping)

```bash
# 1. Type-check (expect only pre-existing SuggestedUsersScreen warning)
cd apps/mobile && npx tsc --noEmit
cd services/feed-service && npx tsc --noEmit

# 2. Confirm feed pipeline memos are stable
# In FeedScreen.tsx, check renderPost deps array includes only useCallback refs:
# [valuedPostIds, handleRecallGrade, handleRecallDefer, handleBountySeeAnswers,
#  handleBountyExplain, handleQuizWarJoin]
# All should be stable (useCallback with [] or [navigation, t] deps)

# 3. Verify slot sizes match real card heights (open in Expo + measure)
# RECALL_CARD: slot.size = 380   (typical resting height)
# FEYNMAN_BOUNTY: slot.size = 500
# QUIZ_WAR: slot.size = 500

# 4. Verify no mock data in production
# In apps/mobile/src/utils/mockEdScores.ts: applyMockEdScores returns items unchanged when !__DEV__
# In FeedScreen.tsx: all three setState calls (setServerRecallCards, setServerBounties,
#   setServerQuizWar) should receive real data in production
```

---

## File Quick Reference

| File | Purpose |
|---|---|
| `apps/mobile/src/screens/feed/FeedScreen.tsx` | Feed pipeline, all Smart Scroll injection |
| `apps/mobile/src/utils/transformPost.ts` | CRITICAL: must map edScore/teacherVerified/_score |
| `apps/mobile/src/utils/mockEdScores.ts` | DEV-only hash fallback — no-op in production |
| `apps/mobile/src/components/feed/RecallCardItem.tsx` | Flashcard UI, 8 subject palettes |
| `apps/mobile/src/components/feed/FeynmanBountyItem.tsx` | Bounty feed card |
| `apps/mobile/src/components/feed/QuizWarBanner.tsx` | War banner, local countdown |
| `apps/mobile/src/screens/feed/BountyDetailScreen.tsx` | Replies + compose + Aha + Award |
| `apps/mobile/src/screens/feed/CreateBountyScreen.tsx` | New bounty form |
| `services/feed-service/src/routes/posts.routes.ts` | CRITICAL: buildResponse + stripToMinimal |
| `services/feed-service/src/routes/recall.routes.ts` | SM-2 endpoints |
| `services/feed-service/src/routes/bounty.routes.ts` | Bounty CRUD |
| `services/feed-service/src/routes/quizWar.routes.ts` | War read + join |
| `services/feed-service/src/utils/sm2.ts` | Pure SM-2 algorithm |
| `services/feed-service/src/utils/bountyEscrow.ts` | Atomic XP stake/award/Aha |
| `services/feed-service/src/feedRanker.ts` | getBrainModeFeed — edScore ORDER BY |
| `packages/database/prisma/seed-smart-scroll.ts` | Production seed (idempotent) |
| `SMART_SCROLL_HANDOVER.md` | Full technical reference document |

---

## What To Do First in This Session

1. Read `SMART_SCROLL_HANDOVER.md` at the project root for full context
2. Fix the dynamic import bug in FeedScreen (P1 — 2 lines)
3. Add `GET /bounties/:id` endpoint + wire BountyDetailScreen to use it (P1)
4. Fix the `course_assignments` migration (P0 — unblocks `prisma migrate dev`)
5. Then continue with whichever feature track is highest priority

**When in doubt about design decisions**: look at `LearningStreakCard.tsx` and
`PerformanceCard.tsx` in the profile screen — these are the design DNA references.
Flat white cards, soft shadow `0 8 / 0.06 / 20`, 24px radius, amber accent for Feynman,
sky-blue for recall/brain mode. Never fake data in production.
