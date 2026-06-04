# Engineering Brief: Production-Hardening the Learning Reels Feature

**Role:** You are a senior software engineering team (10+ years each: a mobile lead, a backend lead, and a product-minded tech lead) taking ownership of the **Learning Reels** feature in the Stunity Enterprise codebase. Your mandate is to take it from "working prototype" to **production-grade, real-world deployable** quality. You care about correctness, data integrity, consistency across surfaces, accessibility, i18n, analytics, and test coverage — not just making it compile.

**Operating principles:**
- **Investigate before you build.** Read the relevant code, confirm current behavior, and identify the root cause before proposing a fix. Don't guess.
- **Start with a plan.** Before writing code, produce a short technical plan per work item: problem statement, root cause, proposed approach, data-model/API changes, files touched, and acceptance criteria. Surface trade-offs and let the owner approve before implementing.
- **Consistency is a feature.** The same rule (e.g. a poll's max options) must hold at creation, in validation (client *and* server), in the news feed, and in reels. No surface-specific drift.
- **No silent regressions.** Preserve existing behavior (combo/XP, SM-2 recall scheduling, mastery tree, optimistic UI) unless explicitly changing it.
- Every user-facing string goes through i18n (`t(...)`), every interactive element keeps its accessibility props, and meaningful actions emit analytics (`track(...)`).

**Key files (already mapped — verify, don't assume):**
- Reels UI: `apps/mobile/src/screens/feed/FocusReelsScreen.tsx` (card components: `QuizCardItem`, `ClozeCardItem`, `TrueFalseCardItem`, `RecallCardItem`, `ReelPoll`, `PostReelItem`)
- Reels feed cache/types: `apps/mobile/src/screens/feed/reelsCache.ts`
- Reels backend: `services/feed-service/src/reelsRanker.ts`, `services/feed-service/src/routes/reels.routes.ts`
- Poll/quiz creation: `apps/mobile/src/screens/feed/create-post/forms/PollForm.tsx`, `apps/mobile/src/screens/feed/CreatePostScreen.tsx`, `services/feed-service/src/routes/postActions.routes.ts`
- News-feed quiz card: `apps/mobile/src/components/feed/PostCardSections.tsx`
- Quiz screens: `apps/mobile/src/screens/quiz/*` (`QuizDetailsScreen`, `TakeQuizScreen`, `QuizResultsScreen`, `BrowseQuizzesScreen`, `MyJoinedQuizzesScreen`)
- Schema: `packages/database/prisma/schema.prisma`

**Confirmed current-state findings (starting context):**
- Poll creation has *inconsistent* caps — `PollForm.tsx` allows up to **10** options, `CreatePostScreen.tsx` caps at **6**, and neither the feed nor the reel caps what it *renders*.
- Reel answers are **not persisted.** `handleQuizQuestion` in `reels.routes.ts` only applies combo/XP and upserts a spaced-repetition `RecallCard` — it never stores *which option the user picked*. This is the root cause of cards resetting to blank on return and being infinitely re-answerable.
- `QUESTION` posts are "answered" via the Comments screen (the discuss CTA) — there is no first-class answer flow today.

---

## Work Item 1 — Poll options: enforce one sane limit everywhere
**Problem:** Poll creation has *inconsistent* caps (`PollForm` allows 10, `CreatePostScreen` allows 6), and neither the news feed nor reels constrains how many options are *displayed* — many options overflow / look broken on a phone.

**Goal:**
- Decide and document a single canonical max (recommend **2–6 options**; justify your choice from a UX standpoint) and enforce it in **one shared constant** used by both creation paths, the Zod/server validator in `postActions.routes.ts`, and any AI-prefill.
- Make the reel and feed renderers degrade gracefully for legacy polls that already exceed the cap (e.g. cap visible options, ellipsize long labels to 1–2 lines, keep the percentage bars readable). No layout break regardless of option count or label length.
- Enforce a per-option character limit consistently.

**Acceptance:** Creating a poll cannot exceed the cap on any path; server rejects over-cap payloads; a 6-option poll with long labels renders cleanly in both the feed and a reel on a small device.

## Work Item 2 — Quiz answer options: same display discipline
**Problem:** Quiz questions (and the reel quiz/cloze/TF cards) can carry many/long answer options that overflow the mobile layout, same failure mode as polls.

**Goal:** Apply consistent option-count and label-length handling to quiz answer rendering in reels and the feed. Define sensible bounds (validated at quiz authoring and server-side), and make the renderers resilient (wrap/ellipsize, never clip). Align the visual language with the poll fix so both read as one design system.

**Acceptance:** A quiz with the maximum allowed options and long answer text renders correctly as a reel card and in `TakeQuizScreen`/feed with no overflow.

## Work Item 3 — "Questions": define and build the answer flow
**Problem:** A `QUESTION` post's only answer path today is the Comments screen — it's implicit and undiscoverable as "answering."

**Goal:** Clarify the intended UX and implement it well. Investigate whether answers should be (a) first-class structured answers (with their own affordance, author attribution, upvotes, "accepted answer"), or (b) explicitly framed comments. Recommend the approach with rationale, then implement: a clear "Answer this" affordance in the reel, a real submission flow, and a way to see existing answers. If comments are the chosen backing store, make the UX read unambiguously as Q&A, not generic discussion.

**Acceptance:** From a question reel, a user can submit an answer and see others' answers through an intentional, labeled flow — not a generic comment thread.

## Work Item 4 — Persist & replay prior responses (the priority fix)
**Problem (root cause confirmed):** Reel quiz/TF/cloze interactions (`handleQuizQuestion` in `reels.routes.ts`) only apply combo/XP and upsert a spaced-repetition `RecallCard` — **the user's selected answer is never stored.** Card components hold answer state in local `useState`, which resets on remount, so returning to an already-answered card shows it blank and lets it be re-answered with no memory.

**Decision (already made by product):** Allow **multiple attempts**, but the card must **show the user's previous answer/result** when they return, with a clear "you've answered this before" affordance and an explicit way to try again.

**Goal:**
- Design a per-user, per-item response record (quiz question / TF / cloze / poll) capturing the chosen option, correctness, timestamp, and attempt number. Add the schema + migration, write path, and read path so the reels feed hydrates each card's prior-response state.
- Update the reel cards to render in a "previously answered" state on return (show their pick, show correct/incorrect, show the explanation), with an explicit **"Answer again"** action that starts a new attempt — without corrupting combo/XP/SM-2 accounting (define how re-attempts interact with XP and recall scheduling; avoid XP farming).
- Apply the same "show my previous vote on return" behavior to **polls** (today the reel only knows the vote if the server returns `userVotedOptionId`; verify it persists across sessions).

**Acceptance:** Answer a cloze/quiz/poll in a reel, scroll away and back (and cold-restart the app): the card shows my prior answer and result, tells me I already answered, and lets me deliberately re-attempt. XP/streak/recall behave sanely on re-attempt.

## Work Item 5 — Level up Quiz History
**Problem:** Quiz history exists only as a browse category / attempts endpoints; it's thin.

**Goal:** Turn it into a genuinely useful history & progress surface. Investigate the existing attempt data (`QuizAttempt`, results endpoints) and build a richer experience: per-quiz attempt timeline, best/latest score, pass/fail trend, per-question accuracy, time spent, and quick re-take / review-results entry points. Tie it into the reels learning loop where it makes sense (e.g. surface weak topics). Keep it performant (paginated, cached).

**Acceptance:** A user can open Quiz History and see a clear, paginated record of their attempts with scores/trends and act on it (review or retake).

---

## Cross-cutting requirements
1. **Plan first, per work item**, and get approval before implementing.
2. **Validate on both client and server**; never trust the client for limits.
3. **Migrations** for any schema change, with backward compatibility for existing data.
4. **i18n + accessibility + analytics** on every new UI affordance.
5. **Tests:** unit tests for new validators/handlers and the response-persistence logic; a brief manual test script for each acceptance criterion.
6. **Performance:** respect the existing reels caching (`feedCache`, module cache, disk cache) — don't add per-card network calls where a batched hydrate will do.
7. **Deliverables per item:** the plan, the implementation, the migration (if any), tests, and a short note on what you verified.

Begin with Work Item 4 (highest user impact), but present the full plan for all five before writing code.
