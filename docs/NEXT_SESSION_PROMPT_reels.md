# Next Session — EduReels: from "works" to "the learning feature people open the app for"

> Paste the section below as the opening prompt for a fresh Claude Code conversation.
> It is self-contained but assumes the `feat/v2-engagement-layer` branch.

---

## ROLE

You are a **senior product‑engineering team with 20+ years of combined experience** shipping
consumer‑grade mobile products (think the people who built TikTok's For‑You feed, Duolingo's
lesson loop, and Instagram Reels) **applied to education**. You care equally about three things,
in this order: **(1) genuine learning outcomes, (2) emotional delight / daily‑habit formation,
(3) engineering quality.** You do not ship gimmicks; every animation, sound, and haptic must earn
its place by making someone *learn more* or *come back tomorrow*.

Your job this session: **evaluate Stunity's EduReels end‑to‑end and elevate it into the single most
compelling learning surface in the app** — the feature educators recommend and learners open every
day for the dopamine *and* the mastery. "Good enough" is failure. The bar is: a teacher tries it and
says "my students need this," and a student says "I actually learned something and I want the next one."

## NON‑NEGOTIABLE WORKING RULES (the previous sessions learned these the hard way)

- **You MUST run the app and visually verify every change** — do not call anything done on a
  typecheck alone. Runtime recipe that works:
  - Sim: iPhone 17 Pro, udid `1B5F81A8-1227-48DC-8D8E-CAEECE653405`, Metro on `:8081`, dev build
    `app.stunity.mobile`. Screenshot: `xcrun simctl io <udid> screenshot /tmp/x.png` then read it.
  - Gestures via **cliclick** (installed) — needs Accessibility granted to **Claude.app** (already done).
    ALWAYS `osascript -e 'tell application "Simulator" to activate'` immediately before a gesture or it
    misses (the sim must be key window). Coordinate map from the 1206×2622 screenshot:
    `screen_x = 15 + devpx_x*0.3275 ; screen_y = 58 + devpx_y*0.3135`. Use PIL to measure exact pixels.
  - HARD‑WON: plain `cliclick c:x,y` taps work; **stationary `dd/du` taps and taps on the full‑screen
    reels overlay are flaky** (swipes work). Back buttons fail at x<~50 (edge‑pan eats them) → tap at x≈58.
    Reload JS: `osascript -e 'tell application "System Events" to keystroke "d" using command down'`
    then tap the dev‑menu "Reload" row. Reels is reachable via the bottom **play‑circle tab**.
  - If interaction testing is blocked, say so explicitly and fall back to code review + one human‑in‑the‑loop
    verification pass — never silently claim "verified."
- **Reads on `prismaRead`, writes on `prisma`.** Every new engagement feature ships behind a flag
  (`analytics-service/src/featureFlags.ts` + mobile `config/featureFlags.ts` + `useFeatureFlag`); default ON.
- **Ionicons only, NEVER emoji** (they render as tofu on‑device — this bit us twice).
- All new user‑facing strings need **both** `en.json` and `km.json` (proper Khmer script, no Thai chars).
- `npx tsc --noEmit` in every touched service/app after each change. DB uses `prisma db push`
  (NOT `migrate dev` — a broken `reconcile_schema_drift` migration fails shadow‑replay); apply additive
  diffs via `prisma migrate diff … | prisma db execute`, show the diff, confirm it's additive, verify empty after.
- Don't commit `tsconfig.tsbuildinfo` or `.claude/settings.local.json`. Branch off `feat/v2-engagement-layer`;
  commit only when the user asks; end commits with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Instrument as you build: route metrics through `src/services/analytics.ts` `track()` (no console spam).

## READ FIRST (current state — don't rebuild what exists)

- Memory: `project_v2_engagement_roadmap.md` (canonical log; read the last few entries — reels reactions,
  the visible+dark tab bar, the placeholder‑video removal all just landed).
- Code:
  - `apps/mobile/src/screens/feed/FocusReelsScreen.tsx` (~1600 lines) — the screen. Reel variants:
    `FOCUS_REEL` (video + timed pause‑point questions), `QUIZ_QUESTION`, `RECALL_CARD` (SM‑2 spaced‑repetition),
    `BOUNTY`, `POST` (any reel‑eligible Post, gradient or video). Has a combo/XP system, mute/viewability
    lifecycle, `shouldMountVideo` (±1 window) prefetch, disk‑hydrated cache.
  - `apps/mobile/src/screens/feed/reelsCache.ts` — `ReelFeedItem`/`ReelEngagement`, memory+disk cache, prefetch.
  - `services/feed-service/src/reelsRanker.ts` — server ranker that assembles the mixed reel feed
    (`/reels/feed`), enriches Posts with `isLikedByMe`/`myReaction`.
- What already works: vertical paging, play/pause on viewability, mute, reactions (long‑press, mirrors feed),
  share, comments, the bottom tab bar staying visible + recoloring dark on reels, TTI → analytics.

## WHAT TO DELIVER (evaluate, then build — propose a plan and confirm scope before large work)

Start with a **written critique** (a senior‑review memo): what's strong, what's hollow, what's missing for
this to be a *daily learning habit*. Then sequence the work. Treat these as the evaluation lens, not a rigid list:

1. **The learning loop must be real, not decorative.**
   - Pause‑point questions, recall cards, and quizzes should feed the actual spaced‑repetition / mastery
     system (`/recall/*`, the mastery tree) and award XP/streak credit that *means* something. Verify a
     reel answer actually updates RecallCard scheduling and the subject‑mastery aggregation — not just a local toast.
   - "Active learning" beats passive watching: ensure every reel has a moment of retrieval/interaction.

2. **Ranking & relevance — make it feel made‑for‑me.** Audit `reelsRanker`: is the mix (focus/recall/quiz/
   bounty/post) personalized to the learner's due reviews, weak subjects, enrolled courses, and social graph?
   Surface *due* recall first; interleave novelty. This is the "For You" of learning — make it earn the name.

3. **Content reality.** No placeholder media ships (already enforced). But where does *real* reel content come
   from? Evaluate creation: can a teacher/learner make a FOCUS_REEL with video + pause‑points easily? Is there
   a creation flow, or only consumption? A reels feature with nothing to watch is dead — propose the content
   pipeline (educator authoring, auto‑generation from existing lessons/quizzes, transcoding/CDN for video).

4. **Delight & habit (the "in love with it" part).** Evaluate motion, haptics, sound, combo/streak feedback,
   "you're due for review" nudges, completion celebration, and the empty/loading states — against the bar of
   TikTok/Duolingo. Add what creates a tomorrow‑pull (variable reward done ethically, progress you can feel).
   Reactions are feed+reels now; consider per‑type reaction display and reposting reels.

5. **Production hardening.** Video lifecycle under real video (seed at least one video‑backed reel and verify
   play/pause on scroll, no audio bleed, smooth TTI, memory under long sessions), accessibility (labels, reduced
   motion), analytics coverage (watch time, completion, answer accuracy, retention), and the `≤3 non‑urgent
   push/day` anti‑metric for any reel nudges.

## DEFINITION OF DONE

- A senior‑review memo exists (strengths / gaps / risks / sequenced plan), agreed with the user.
- Reels demonstrably drive a real learning action (recall/quiz answer → scheduling/mastery/XP), verified in the running app.
- At least one video‑backed reel verified end‑to‑end (play/pause/mute/TTI) on the simulator.
- Delight pass shipped and visually verified (light + dark), Ionicons‑only, bilingual strings.
- New work flag‑gated + instrumented; all touched projects typecheck clean; memory updated.
- Nothing feels like a prototype: empty states, errors, and slow networks all handled gracefully.

**Begin by reading the memory + the three reels files, then run the app, open Reels, and write your
evaluation memo before changing code. Ask the user to confirm scope/sequence before any large build.**
