# Engineering Brief: Quality Audit & Polish — Learning Reels & Feed

**Role:** You are a senior software engineering team (10+ years each: a mobile
lead, a backend lead, and a product-minded tech lead) doing a **quality audit**
of the Stunity Enterprise app — a React Native (Expo) mobile client + Node/
Express microservices + Prisma/Postgres (Supabase). The Learning Reels feature
(TikTok-style vertical learning feed) was recently hardened, but a hands-on pass
surfaced rough edges. Your job is to **find, root-cause, and fix correctness and
UX-quality issues**, with production-grade rigor — not just make symptoms
disappear.

## Operating principles
- **Investigate before you build.** Read the relevant code, reproduce the issue,
  and confirm the root cause before proposing a fix. Don't guess.
- **Plan first.** For each issue: problem statement, root cause, proposed fix,
  files touched, risks/trade-offs, and acceptance criteria. Get sign-off before
  implementing anything non-trivial.
- **No silent regressions.** Preserve existing behavior (combo/XP, SM-2 recall
  scheduling, optimistic UI, caching) unless explicitly changing it.
- **Consistency is a feature.** A fix must hold across every surface (reels,
  news feed, detail screens), not just the one screenshot.
- Every user-facing string goes through i18n (`t(...)`), every interactive
  element keeps accessibility props, and meaningful actions emit analytics
  (`track(...)`). Validate on client **and** server; never trust the client.
- **Tests:** add/adjust unit tests for any logic you change; provide a short
  manual test script per fix.

## Key areas / files (verify, don't assume)
- Reels UI: `apps/mobile/src/screens/feed/FocusReelsScreen.tsx`
  (cards: `QuizCardItem`, `ClozeCardItem`, `TrueFalseCardItem`, `RecallCardItem`,
  `ReelPoll`, `PostReelItem`, `ReelSidebar`)
- Reels feed cache: `apps/mobile/src/screens/feed/reelsCache.ts`
- Reels backend: `services/feed-service/src/routes/reels.routes.ts`,
  `services/feed-service/src/reelsRanker.ts`
- Likes/reactions: `services/feed-service/src/routes/postActions.routes.ts`,
  `services/feed-service/src/utils/reactionCounts.ts`,
  reel-likes work recently added in `services/feed-service/src/routes/focusReel.routes.ts`
- Engagement types: `ReelEngagement` in `reelsCache.ts` / `reelsRanker.ts`

---

## Issue 1 — Reaction state is inconsistent: filled red heart but count "0"

**Symptom (repro):** Open Reels. On an interactive card (e.g. a **Cloze / "Fill
the blank"** card, and a **Flashcard / Recall** card), the like button renders as
a **filled red heart** (the "liked" state) while the count next to it shows
**0** — and the comment count shows 0 too. The heart appears liked even though
nothing was tapped, and/or the count never reflects the like.

**Investigate:**
- Is the heart's filled/red style driven by actual `engagement.isLikedByMe` /
  `myReaction`, or is it rendering a default "liked" look regardless of state?
- These card types (cloze/recall/quiz) are **QuizQuestion-backed, not Post-backed**
  — do they even have a `postId` to like? If not, should the like/comment affordance
  be shown at all, hidden, or wired to a real target? (Note: a recent change
  "enable likes and comments on FocusReels and RecallCards" — verify it's correct
  and consistent for *all* card types, including those without a backing post.)
- Trace `ReelEngagement` from `reelsRanker` → `/reels/feed` hydration →
  `ReelSidebar`: where does `isLikedByMe`/`likesCount`/`reactionCounts` come from
  for non-post cards, and is optimistic update reconciling with the server?

**Expected outcome:** Like/reaction state is **always internally consistent** —
the heart's visual state matches `isLikedByMe`, the count matches the real total,
optimistic taps reconcile with the server, and cards that genuinely can't be
liked don't show a misleading filled-heart/zero affordance. Define the intended
behavior for QuizQuestion-backed cards explicitly and apply it consistently.

---

## Issue 2 — Reels pagination stalls scrolling at the page boundary

**Symptom (repro):** Scrolling Reels is smooth within a loaded page, but when you
reach the **end of the current page**, you **cannot scroll to the next reel until
the next page's data finishes loading** — there's a ~1s hard stop, then scrolling
resumes. It feels like the list blocks on the network fetch.

**Expected behavior (match best-in-class social feeds):** Reaching the page
boundary should **never block the gesture.** Prefetch the next page **before** the
user hits the end (e.g. when N items remain), so data is usually ready in advance;
and if it isn't ready yet, show a **non-blocking loading state** (a skeleton/blur
"next" placeholder or spinner) that the user can still scroll into — like
Instagram Reels / TikTok — rather than freezing the scroll.

**Investigate:**
- The `FlashList`/`FlatList` config in `FocusReelsScreen.tsx`: `onEndReached`
  threshold, `pagingEnabled`/snap behavior, and how `loadingMore` interacts with
  the scrollable content. Is the next page only fetched *at* the boundary?
- The prefetch threshold logic (`PREFETCH_THRESHOLD` / `fetchMore`) and module
  cache in `reelsCache.ts` — is prefetch firing early enough?
- Is something disabling scroll or withholding the next item until data arrives
  (e.g. not rendering a placeholder cell)?

**Expected outcome:** Continuous, uninterrupted vertical scrolling across page
boundaries; next page prefetched ahead of time; a graceful non-blocking loading
cell only when genuinely waiting. No regression to the instant first-page-from-
cache experience.

---

## Also in scope (broader quality sweep — report findings, fix the clear wins)
- Audit the reels card components for similar **state/visual desync** bugs
  (like/bookmark/comment counts, optimistic vs. server reconciliation).
- Check **accessibility** and **i18n** coverage on the reels surfaces (some
  strings/labels may be missing).
- Note any **performance** smells (unnecessary re-renders, per-card network
  calls, video buffering) — but don't over-optimize; flag and prioritize.

## Deliverables
For each issue: the investigation/root-cause writeup, a short plan (approved
before coding), the implementation, tests, and a manual verification script.
Start with **Issue 1 and Issue 2** (highest user impact); present a brief plan
for both before writing code.

> Context: the repo is a Yarn/npm **workspaces monorepo**. Mobile app in
> `apps/mobile`, web in `apps/web`, services in `services/*`, Prisma schema in
> `packages/database`. Typecheck with `npx tsc --noEmit` per package; feed-service
> tests via `jest` (run with the workspace-root binary). The default branch is
> `main`; branch before committing.
