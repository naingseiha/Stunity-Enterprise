# Mobile Perf Phase 2 — Extending the Feed Playbook to the Rest of the App

> **Handoff document for a fresh Claude Code conversation.** Read this end-to-end
> before touching code. Phase 1 (feed surface) is shipped and tuned; this doc
> describes how to bring the rest of the app to the same standard.

---

## 0. Quick start for the new agent

You are continuing performance work that was completed for the feed surface in
commit [`6bd0b73e`](https://github.com/naingseiha/Stunity-Enterprise/commit/6bd0b73e)
on `main`. Read that commit message first — it documents the exact patterns,
measured impact, and architecture decisions. Then read this doc.

**Do not** redo any of these (already done in phase 1):

- expo-image migration in feed components + screens (see "What's already done" below for the full list)
- FlashList tuning in `FeedScreen.tsx`
- Pagination race + retry on `feedStore.fetchPosts`
- Backend pre-warm helper (`apps/mobile/src/services/backendPrewarm.ts`)
- Cloud Run feed-service in `asia-southeast1` with min=1, session-pooler, Upstash Redis
- Server-side timing instrumentation on `/posts/feed`

**Working principle:** This is the rest of an app that already has a working
production stack. Don't over-engineer. Match the established patterns, apply
them where they actually help, leave low-traffic surfaces alone. Real-user
metrics > theoretical optimization.

---

## 1. What's already done (don't redo)

### Mobile rendering

- **expo-image migrated** in: `LanguageSelector.tsx`, `common/ImageCarousel.tsx`,
  `common/SplashScreen.tsx`, `feed/PostCard.tsx`, `feed/PostContent.tsx`,
  `feed/StoryCircles.tsx`, `feed/SuggestedUsersCarousel.tsx`,
  `clubs/ClassDetailsScreen.tsx`, `clubs/ClassGradesScreen.tsx`,
  `clubs/ClassLeaderboardScreen.tsx`, `clubs/ClassReportScreen.tsx`,
  `learn/LessonViewerScreen.tsx`, `profile/EditProfileScreen.tsx`
- **FlashList tuning** complete in `screens/feed/FeedScreen.tsx` —
  `estimatedItemSize`, `getItemType`, `overrideItemLayout`, `drawDistance`,
  stable `keyExtractor`, `handlersRef` pattern, granular Zustand selectors,
  `removeClippedSubviews={false}` (intentional), `onEndReachedThreshold=0.6`
- **PostCard memo + comparator** at `components/feed/PostCard.tsx`
- **Pre-warm helper** at `services/backendPrewarm.ts`; called from `authStore`
  at every auth success path

### Backend / infra

- Cloud Run feed-service + auth + notification + learn deployed to
  `asia-southeast1`. Other services still in `us-central1` (cold path).
- Mobile prod URLs in `apps/mobile/src/config/env.ts` hybrid-routed:
  hot path → `-as.a.run.app`, cold path → `-uc.a.run.app`.
- Upstash Redis live (`CLOUD_RUN_REDIS_URL` in `.env`); session/precompute
  caches persist across instance restarts.
- `deploy-cloud-run.sh` and `deploy-production-core.sh` updated: keepalive
  auto-on for min=1 services, `REDIS_URL` threaded through, notification
  min=1 by default.
- DB: Supabase Pro Sydney via session-mode pooler (port 5432) — DO NOT
  migrate region. User explicitly rejected that.

### Dev workflow

- `quick-start.sh` and `start-all-services.sh` default to dev DB (Singapore)
  when `.env.development.local` exists. Override with `STUNITY_ALLOW_PROD_DB=1`.
- Local Redis via `brew services start redis` (auto-starts at login).
- `PRISMA_CONNECTION_LIMIT=10` in dev.

---

## 2. The canonical playbook (apply to each screen)

For each screen or list domain you audit, walk these steps in order. **Stop
at any step that doesn't apply** — don't apply optimizations preemptively.

### Step 1: Identify the work

Ask:
1. **Does this screen render a long list?** → FlashList migration candidate.
2. **Does this screen render multiple images?** → expo-image audit candidate.
3. **Does this screen subscribe to a Zustand store?** → selector tightening candidate.
4. **Does this screen do network fetches that can fail?** → retry-on-timeout candidate.
5. **Does this screen do work that could time out the backend?** → pre-warm candidate.

If none of the above, **skip this screen.**

### Step 2: Image audit

For every `<Image>` JSX usage in the screen:

- Replace `from 'react-native'` import with `from 'expo-image'`.
- Remote URLs (`{ uri: ... }`): add
  ```tsx
  cachePolicy="memory-disk"
  priority="high"     // only if user-facing on hot path; "normal" otherwise
  transition={150}
  recyclingKey={url}  // the actual URL string
  contentFit="cover"  // or "contain" if previously resizeMode="contain"
  ```
- Convert `resizeMode="..."` → `contentFit="..."` (expo-image renamed the prop).
- If the file had `Image,` listed in the RN destructure but no `<Image` JSX
  render, leave it (dead import — too noisy to chase). Two known dead imports
  exist: `stores/feedStore.ts`, `services/imageCache.ts` — skip them.

### Step 3: List engine

If the screen renders ≥20 items or has infinite scroll:

- **Replace FlatList with FlashList** (`@shopify/flash-list` is already a dep).
- Add: `estimatedItemSize={...}` (measure with a typical item), `getItemType`
  (return a stable string per visual variant), `keyExtractor` (memoized,
  stable). Optional: `overrideItemLayout` if item sizes are predictable per
  type.
- `onEndReachedThreshold={0.6}` for FB-style early prefetch.
- **Do NOT add `canTriggerEndReachedRef` / `onMomentumScrollBegin` gates** —
  that was the bug we removed from FeedScreen. Trust the store's internal
  dedup.
- Render skeleton placeholders in `ListFooterComponent` during page>1 loads
  (use `PostSkeleton` or domain-equivalent).

If the screen has <20 items or is a one-shot list, **leave FlatList/ScrollView**.

### Step 4: Memoization

Only memoize when there's an actual measured re-render problem. Premature
memo bloats the bundle. Concrete signals:

- A list cell re-renders on every parent state change.
- A heavy child component (>200ms render) re-mounts unnecessarily.

If yes, wrap in `React.memo` with a custom comparator. **Pattern lives in
`components/feed/PostCard.tsx`** — copy the structure (custom `arePropsEqual`
that checks only the props that change during interactions). Don't memoize
just because.

### Step 5: Zustand selectors

For screens that use `useFooStore`:

- **Bad:** `const { a, b, c, d, fetchX, fetchY } = useFooStore();` —
  re-renders on every store change.
- **Good:** `const a = useFooStore(s => s.a);` and so on, one per slice.
- Pattern reference: `FeedScreen.tsx:272-287` ("M1 FIX" comment block).

### Step 6: Network resilience

If the screen does paginated fetches like the feed:

- For load-more paths (page > 1), wrap the request in a one-shot retry
  on `ECONNABORTED` / `TIMEOUT_ERROR` with a ~700ms delay. Pattern lives in
  `stores/feedStore.ts` around line 407 (search "Load-more timeout").
- For first-page paths, prefer fast-fail + UI fallback over retries (avoid
  long blocking states).
- If the screen is on the hot path right after auth, add its base service
  to `services/backendPrewarm.ts` `prewarmHotServices()`.

### Step 7: Verification

Always run `npx --no-install tsc --noEmit` from `apps/mobile/` after each
file you touch. tsc must stay clean — no new errors introduced. If something
fails type-check, fix or revert.

---

## 3. Per-domain audit checklist

Domains in priority order — start at the top. Each domain has:

- **Scope:** what files/screens to focus on
- **Lists to consider:** which lists likely warrant FlashList migration
- **Image sites:** where remote images render
- **State stores:** which Zustand stores it touches
- **Risk notes:** known gotchas

### 3.1 Learn / Course (priority 1 — likely high-traffic)

**Scope:** `screens/learn/` (8 screens), `components/learn/` if exists,
`packages/shared` learn types.

- `LearnScreen.tsx` (2077 LOC) — discovery hub. **Probably has a list of
  courses + sections.** Audit for FlashList candidacy.
- `CourseDetailScreen.tsx` (1379 LOC) — sections + lessons list.
- `CreateCourseScreen.tsx` (2617 LOC) — form, NOT a list. Skip lists,
  audit for heavy re-renders inside the editor.
- `LessonViewerScreen.tsx` (2064 LOC) — already partially migrated to
  expo-image in phase 1 (lesson primary image, inline preview). **Don't
  re-do those.** Audit for video poster handling and resource list.

**Lists to consider:** course catalog, section/lesson nesting,
resources/materials per lesson, course reviews, Q&A threads.

**Image sites:** course thumbnails, lesson primary images (DONE),
instructor avatars in course cards.

**State store:** look for `learnStore` or equivalent (might be inside a
custom hook). Audit selectors.

**Risk notes:**
- `learn-service` is in `asia-southeast1` with min=0 (allowed to cold-start).
  If you find users hit Learn on app launch frequently, bump min=1 via
  `CLOUD_RUN_MIN_INSTANCES_LEARN=1` in `deploy-production-core.sh` and redeploy.
- Lesson viewer renders rich content (PDF, code, images, video). Be careful
  not to break working media handling — only migrate Image components, don't
  refactor lesson rendering.

### 3.2 Clubs / Class (priority 2 — most screens)

**Scope:** `screens/clubs/` (22 screens). Yes, "clubs" naming is overloaded
— same dir holds both school clubs and class-management screens.

- `ClubsScreen.tsx` (2402 LOC) — root list, audit FlashList.
- `ClassDetailsScreen.tsx` (1874 LOC) — already migrated images in phase 1.
- `ClassReportScreen.tsx` (2156 LOC) — already migrated images.
- `ClassLeaderboardScreen.tsx`, `ClassGradesScreen.tsx` — already migrated.
- `ClassDirectoryScreen.tsx`, `ClassMaterialsScreen.tsx`,
  `ClassAssignmentsScreen.tsx`, `ClassAnnouncementsScreen.tsx`,
  `ClubMaterialsScreen.tsx`, `ClubAnnouncementsScreen.tsx`,
  `DisciplineWorkbenchScreen.tsx` — all use FlatList. **Highest FlashList
  conversion ROI lives here.**

**Lists to consider:** student rosters, class materials, announcements,
assignment lists, attendance lists, leaderboards (per-class).

**Image sites:** student avatars (heavy — every list row has one), club
cover photos, material thumbnails.

**State store:** `clubStore`, `classHubStore`. Both have not been audited
for selector hygiene. Worth a pass.

**Risk notes:**
- `club-service` is still in `us-central1` (cold path). If you observe
  consistent slowness on Clubs tab open, this is the first thing to migrate
  to `asia-southeast1` (~30min work using the existing deploy script with
  `REGION=asia-southeast1 CLOUD_RUN_MIN_INSTANCES_CLUB=1`).
- Some screens render avatars 50+ times (full class rosters). expo-image
  with `recyclingKey={student.id}` is critical — without it the same avatar
  re-decodes on every scroll.

### 3.3 Profile (priority 3 — heavy screens, high re-render risk)

**Scope:** `screens/profile/` (15 screens), `screens/profile/components/`.

- `ProfileScreen.tsx` (**3391 LOC — largest file in the app**) — definitely
  audit for memo + selector tightening. Likely renders multiple tabs, header,
  cover photo, stats rings (similar to feed `PerformanceCard`).
- `UserCardScreen.tsx` (2598 LOC) — public profile of another user.
- `SettingsScreen.tsx` (1580 LOC) — mostly form/toggles, NOT a perf hot path.
- `components/PerformanceTab.tsx` (1540 LOC) — likely has animations + SVG
  rings like feed's `PerformanceCard`. Memoize.
- `EditProfileScreen.tsx` — already migrated cover image in phase 1.
- `ProfileVisitorsScreen.tsx`, `BlockedUsersScreen.tsx` — user list screens,
  audit FlashList + expo-image avatars.

**Lists to consider:** posts authored by user, achievements grid, visitors,
followers/following.

**Image sites:** profile picture, cover photo, achievement badges, post
thumbnails in "my posts" view.

**State store:** mostly `authStore.user` for own profile, may have a separate
`userStore` for viewing others. Audit if found.

**Risk notes:**
- The Profile screen has the highest re-render risk because user details
  change across tabs without dismount. Memo each tab as a top-level component.
- The SVG ring animations (XP, streak, etc.) — if they `useNativeDriver: false`,
  consider migrating to react-native-reanimated for UI-thread animation. But
  only if you observe jank.

### 3.4 Quiz / Live-Quiz (priority 4 — interactive, time-sensitive)

**Scope:** `screens/quiz/` (7 screens), `screens/live-quiz/` (6 screens),
`components/quiz/`.

- `BrowseQuizzesScreen.tsx` — list, audit FlashList.
- `TakeQuizScreen.tsx` (1530 LOC) — quiz-taking flow. **Audit very carefully**
  — this is interactive, every render delay = user perception of lag. Question
  transitions should be sub-100ms.
- `QuizStudioScreen.tsx` — editor, form-heavy not list-heavy.
- `live-quiz/LiveQuizLobbyScreen.tsx` — participant list, WebSocket-driven.
  FlashList if >20 participants.

**Lists to consider:** quiz library, question list (in TakeQuiz), participants
in live-quiz lobby, leaderboard during live quiz.

**Image sites:** question images, option images, quiz cover thumbnails.

**State store:** `messagingStore` for live-quiz socket events, or a custom
`liveQuizStore`. Audit selectors.

**Risk notes:**
- `quiz-service` doesn't exist as a separate service — quiz endpoints live
  in `feed-service`. Already in `asia-southeast1`. No backend migration needed.
- Live quiz is realtime via Supabase or socket. Don't touch the connection
  layer; only optimize rendering.

### 3.5 Messaging (priority 5 — chat-style, special)

**Scope:** `screens/messages/` (3 screens), `stores/messagingStore.ts`.

- `ConversationsScreen.tsx` — list of conversations. Audit FlashList.
- `ChatScreen.tsx` — message list. **FlashList with `inverted` mode** is the
  industry pattern for chat. Test thoroughly — chat lists have their own
  perf footguns (image inline rendering, scroll-to-bottom on new message).
- `NewMessageScreen.tsx` — user search list.

**Image sites:** avatar in every conversation/message row, image attachments
in chat.

**State store:** `messagingStore`. Audit selectors AND check whether each
incoming message triggers a full conversation re-render.

**Risk notes:**
- `messaging-service` is NOT deployed (`SKIP_MESSAGING_SERVICE=1` in dev,
  no Cloud Run revision in prod). If messaging is being prioritized,
  the service needs to be deployed first — DO NOT optimize a service that
  doesn't run.

### 3.6 Attendance (priority 6 — small surface)

**Scope:** `screens/attendance/` (2 screens).

- `AttendanceCheckInScreen.tsx` (2080 LOC) — the only screen of consequence.
  Renders a list of students (potentially 50+) with avatars + check-in buttons.
  **FlashList + expo-image audit is high ROI here.**

**Lists:** student roster for attendance.

**Image sites:** student avatars (every row).

**State store:** likely `clubStore` or inline state. Audit if a store is used.

**Risk notes:**
- `attendance-service` is in `us-central1`. Same migration consideration as
  clubs — only move if data justifies it.

### 3.7 Smaller domains (priority 7+)

- `screens/assignments/` (5 screens) — assignment list + submission. Apply
  playbook same as clubs.
- `screens/parent/` (5 screens) — parent-mode views of student data. Lists of
  students/classes.
- `screens/stats/` (4 screens) — analytics charts. **Charts may be a perf
  issue if using non-native libraries.** Profile and decide.
- `screens/gamification/LeaderboardScreen.tsx` — already uses FlatList; convert.
- `screens/notifications/` (1 screen), `screens/achievements/` (1 screen) —
  single screens. Quick passes.
- `screens/auth/` (10 screens) — auth flow. Forms, NOT lists. Skip unless
  there's a measured launch-time perf issue.

---

## 4. Cross-cutting tasks (not screen-specific)

These can be done independently or interleaved with the per-domain work.

### 4.1 Zustand store audit (high value, low risk)

For each of: `clubStore`, `classHubStore`, `leaderboardStore`,
`messagingStore`, `notificationStore`:

1. Open the store file at `apps/mobile/src/stores/`.
2. Search the codebase for `useFooStore` usages.
3. For any usage that destructures multiple slices, refactor to one
   `useFooStore(s => s.slice)` per slice.
4. Use `FeedScreen.tsx:272-287` as the canonical pattern.

This change is mechanical and almost always safe. tsc will catch any
naming mistakes.

### 4.2 Dead RN-Image-import cleanup (cosmetic, low priority)

Two files import `Image` from `react-native` but never render it as JSX:

- `apps/mobile/src/stores/feedStore.ts`
- `apps/mobile/src/services/imageCache.ts`

Both can have the unused `Image,` removed from the `from 'react-native'`
destructure. Cosmetic only — doesn't affect bundle (tree-shaken anyway).

### 4.3 Mobile prod URLs for cold-path services

When you migrate a cold-path service (club, class, teacher, etc.) to
`asia-southeast1`, update its URL in
`apps/mobile/src/config/env.ts` `production` block from
`-uc.a.run.app` → `-as.a.run.app`. Don't update preemptively — only after
the service is actually deployed to the new region.

### 4.4 Cloud Run min-instances for hot-path discovery

Currently min=1 is set for: `auth`, `feed`, `notification`. Set min=1
for additional services only when real-user telemetry shows their
cold-start hurts UX. Candidates to watch:

- `learn-service` (already deployed to asia-southeast1, min=0).
- `club-service` (in us-central1 still).

Each min=1 instance costs ~$5–8/mo on `--no-cpu-throttling`. Don't enable
preemptively.

### 4.5 Server-side timing instrumentation in other hot routes

Phase 1 added `⏱️ [Feed]` timing in `services/feed-service/src/routes/posts.routes.ts`.
If you find another endpoint that's "mysteriously slow," apply the same
pattern: capture `performance.now()` at each phase, log a single tape line
gated to non-production. Pattern lives at lines 595-619 of that file.

### 4.6 Memorystore migration (deferred, do not start until)

Upstash free tier handles ~3k MAU. When you cross that line:

- Provision Memorystore Basic 1GB in `asia-southeast1` (~$35/mo).
- Set up Serverless VPC Connector for Cloud Run access.
- Update `CLOUD_RUN_REDIS_URL` in `.env` (private IP, no TLS).
- Re-deploy hot-path services.

Do not do this preemptively. Document trigger metric in `docs/MONITORING.md`
(if it exists; otherwise create with that one metric).

---

## 5. How to verify perf changes

### Local dev

After any change:

```bash
# 1. Type-check must stay clean
cd apps/mobile && npx --no-install tsc --noEmit

# 2. For frontend list/image changes, build a release iOS binary:
EXPO_PUBLIC_APP_ENV=production npx expo run:ios --configuration Release
# (env var is APP_ENV, not ENV — env.ts reads EXPO_PUBLIC_APP_ENV)

# 3. Scroll the changed screen for 30 seconds on simulator (or device)
#    — physical device is better signal for 90/120Hz scroll
```

### Backend / Cloud Run

If you touched a service:

```bash
cd /Users/naingseiha/Documents/projects/Stunity-Enterprise

# Verify tsc clean for that service
cd services/<service-name> && npx --no-install tsc --noEmit && cd -

# Re-deploy that service only
DATABASE_URL="<session-pooler-URL-from-.env>" \
  REGION=asia-southeast1 \
  ./scripts/deploy-cloud-run.sh <service-name>

# Probe latency
SERVICE_URL=$(gcloud run services describe stunity-<service-name> \
  --region=asia-southeast1 --format="value(status.url)")
for i in 1 2 3 4 5; do
  curl -s "$SERVICE_URL/health/ready" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['checks'])"
  sleep 0.5
done
```

### Real device on prod

The actual perf benchmark. Build with `EXPO_PUBLIC_APP_ENV=production`,
scroll the screen 30 seconds, watch Cloud Run logs:

```bash
gcloud beta run services logs tail stunity-<service> \
  --region=asia-southeast1
```

Look for:
- Zero `🐌 [SLOW REQUEST]` lines under 1s, ideally none over 500ms.
- ETag `304` responses on repeated navigation (proves caching works).
- Cache hit rate visible in `cacheLookup` timing if you added instrumentation.

---

## 6. Anti-patterns / things NOT to do

Hard-learned from phase 1.

### Don't preemptively add `onMomentumScrollBegin` gates

The "I'll dedupe by hand with refs" pattern races against store state.
Trust the store's internal `isLoading` check. See `FeedScreen.tsx:480-488`
for the simple version that works.

### Don't use Image cache without `recyclingKey`

expo-image without `recyclingKey={url}` will re-decode the same image
every time the row is recycled in a list. The `recyclingKey` tells
expo-image "this is the same image as before, reuse the bitmap."

### Don't set `removeClippedSubviews={true}` on lists with images

Causes images to detach and re-attach on every scroll cycle. Visible as
"flicker" on Android. Phase 1's `FeedScreen.tsx` explicitly disables this.

### Don't migrate small lists to FlashList

FlashList has setup overhead. Under ~20 items or one-shot views, plain
FlatList or ScrollView is fine and simpler.

### Don't memoize without measuring

`React.memo` adds prop-comparison overhead on every render. If a component
isn't actually re-rendering unnecessarily, memo makes it slower. Use
React DevTools Profiler or console-log render counts before adding memo.

### Don't change DB region or migrate Supabase

User explicitly rejected this in phase 1. Pro plan + session pooler hits
the same wire-speed (~96ms RTT Singapore→Sydney) without data migration
risk. Don't revisit.

### Don't bump max-instances above 1 on feed-service

Background ranker precompute job runs per-instance. With max>1, the job
multiplies and overloads the DB. Either keep max=1 OR migrate the job to
a separate Cloud Run Job + Cloud Scheduler (deferred work).

### Don't update mobile prod URLs preemptively

`apps/mobile/src/config/env.ts` production block. Only flip `-uc → -as`
for a service AFTER that service is actually deployed to `asia-southeast1`.

### Don't add new services to `prewarmHotServices()` without justification

Each ping wakes a cold container. Adding cold-path services causes
unnecessary Cloud Run cost. Only add services that are reliably hit on
every app launch.

---

## 7. Recommended execution order

Phase 2A — high ROI, low risk (do first):

1. **Zustand store audit** (4.1) — mechanical, no UX risk, helps every screen
2. **Clubs/Class FlashList migration** (3.2) — biggest list-render footprint
3. **Profile screen memo + selectors** (3.3) — largest file, likely re-render hotspot
4. **Attendance check-in FlashList + avatars** (3.6) — small surface, big win
5. **Learn screen audit** (3.1) — high traffic if education-focused users

Phase 2B — medium priority:

6. Quiz / Live-quiz (3.4)
7. Messaging — but only after messaging-service is deployed (3.5)
8. Assignments (3.7)

Phase 2C — when metrics demand it:

9. Cold-path service migration to asia-southeast1 (club, class, etc.)
10. Memorystore migration (4.6)
11. Background ranker → separate Cloud Run Job
12. Fanout-on-write architecture (only at >100k MAU)

---

## 8. Where to find canonical examples in this repo

Whenever you're unsure how to apply a pattern, copy from these files:

| Pattern | Reference file |
|---|---|
| expo-image migration (remote URL, hot path) | `components/feed/PostContent.tsx` lines 153-180 |
| expo-image migration (avatar with prefetch) | `components/common/Avatar.tsx` |
| FlashList tuning | `screens/feed/FeedScreen.tsx` lines 993-1030 |
| getItemType + overrideItemLayout | `screens/feed/FeedScreen.tsx` lines 706-742 |
| React.memo with custom comparator | `components/feed/PostCard.tsx` lines 793-827 |
| Granular Zustand selectors | `screens/feed/FeedScreen.tsx` lines 272-287 |
| handlersRef pattern (stable callbacks) | `screens/feed/FeedScreen.tsx` lines 667-678 |
| Load-more retry on timeout | `stores/feedStore.ts` lines 406-440 |
| Backend pre-warm | `services/backendPrewarm.ts` (whole file) |
| Server-side timing tape | `services/feed-service/src/routes/posts.routes.ts` lines 595-619 |
| Cloud Run deploy with overrides | `scripts/deploy-production-core.sh` + the `gcloud run services update` patterns in phase 1 commit |

---

## 9. Final notes for the new agent

- **Ship in small slices.** One domain per commit. Easier review, easier
  rollback if a regression slips through.
- **Always run `tsc --noEmit` before committing.** Phase 1 had zero tsc
  regressions; maintain that.
- **Match existing commit style.** Conventional commits with scopes:
  `perf(profile):`, `perf(learn):`, etc.
- **Don't touch `.env` or `.env.development.local`** in commits — both are
  gitignored, contain secrets, and have user-specific dev values.
- **When in doubt, measure first.** The biggest wins in phase 1 came from
  reading actual server logs (`⏱️ [Feed]`, `🐌 [SLOW REQUEST]`), not from
  guessing. The pattern: instrument → observe → fix → verify.

Good luck. The architecture is sound; you're just propagating proven patterns.
