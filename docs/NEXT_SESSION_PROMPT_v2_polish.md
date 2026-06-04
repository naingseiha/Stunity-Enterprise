# Next-session prompt — v2 production polish (feed, EduReels, repost redesign)

> Copy everything in the fenced block below into a fresh Claude Code conversation.

```
You are continuing the Stunity v2 daily-engagement initiative. The previous
session shipped six engagement hooks + feature flags + an analytics pipeline on
branch `feat/v2-engagement-layer` (already pushed). Read these first for full
context, then proceed:
  - Memory: project_v2_engagement_roadmap.md (the canonical record of what's built)
  - docs/STUNITY_v2_IMPLEMENTATION_ROADMAP.md
  - docs/FEATURE_FLAGS_AND_METRICS.md

MISSION
Make the app genuinely production-ready and visually polished, with a focus on
(1) the repost design, (2) the feed, and (3) EduReels (FocusReelsScreen). The
goal is a real-world, powerful app where everything works well — not just
typecheck-clean. CRITICAL: the previous session could not run the React Native
app, so nothing is runtime-verified. You MUST run the app (use the /run or
/verify skill, or expo) and visually confirm each flow before calling it done.

PRIORITY 1 — Redesign the repost / quote rendering
Current files: apps/mobile/src/components/feed/PostContent.tsx (the
`repostEmbed*` block, styles ~444+), PostCard.tsx (`repostLabel`, the repost
header), RepostComposer.tsx (compose modal). A repost is a Post authored by the
user with `repostOfId` + `repostComment`; the commentary is stored as
`post.content` and renders as the body above the embedded original.

Problems to fix (see the reference screenshot the user provided):
  - The quoted card shows the ORIGINAL's like/comment counts (❤ 2 💬 0) INSIDE
    the box while the outer repost ALSO has a full action bar — two competing
    engagement rows. Suppress or strongly mute the inner stats so it's clear the
    action bar acts on the repost.
  - Three stacked identity rows ("X reposted" label → reposter header → original
    author header). Tighten toward X/Twitter quote-tweet style: keep the small
    "X reposted" affordance, the reposter's comment, then a LIGHT quoted card
    (smaller avatar, condensed, subtle border, less padding).
  - The "Read Article →" CTA and "Article" type tag float ambiguously between
    the quote and the action bar — clarify they belong to the original.
  - Identify the unexplained diamond icon at the end of the action bar and either
    label/justify it or remove it.
  - Verify reactions (long-press like) and the action bar behave correctly ON a
    repost, and that quote-reposts (with commentary) look great, not just bare
    reposts.
Make it look polished and intentional. Use Ionicons only (NEVER emoji — they
render as tofu boxes on-device; this bit us already). Respect light/dark themes
via useThemeContext.

PRIORITY 2 — EduReels (FocusReelsScreen) production review
File: apps/mobile/src/screens/feed/FocusReelsScreen.tsx (~1572 lines) +
reelsCache.ts + services/feed-service/src/reelsRanker.ts.
  - REMOVE the hardcoded mixkit sample video URL (~line 83) — no placeholder
    media may ship to production. Verify real reel media loads/plays.
  - Verify video lifecycle on scroll: play/pause on viewability, mute state,
    `shouldMountVideo` (±1 window), no audio bleed, smooth TTI.
  - Reactions & reposts are currently FEED-ONLY. Decide with the user whether
    EduReels needs reactions; if yes, extend the reaction system to reels.
  - Route `[Reels TTI]` / console.log debug lines to the new analytics `track()`
    (src/services/analytics.ts) or structured logging — don't ship console spam.

PRIORITY 3 — Feed production review
  - Confirm `myReaction` + reaction picker render correctly across ALL feed
    entry points: main feed, profile Posts tab (own = /my-posts), Bookmarks,
    MyPosts. Verify optimistic update + revert.
  - Confirm the compact streak chip in the header looks right with/without an
    active streak (it hides at 0).
  - Sanity-check empty states, loading skeletons, and that flag-gated features
    (reactions, endorsements, mastery_tree, streak_leaderboard, streak_ring)
    appear (flags default ON).

CONVENTIONS / HARD-WON LESSONS (do not relearn these)
  - DB: the repo uses `prisma db push`, NOT `migrate dev` (a broken
    reconcile_schema_drift migration fails shadow-replay). To apply schema
    changes, generate the diff with `prisma migrate diff
    --from-schema-datasource ... --to-schema-datamodel ... --script` and apply
    via `prisma db execute`. ALWAYS show the diff and confirm it's additive
    before applying. Verify the diff is empty afterward.
  - Reads go on `prismaRead`, writes on `prisma` (read-replica routing).
  - Every new engagement feature is gated by a flag
    (analytics-service/src/featureFlags.ts + mobile config/featureFlags.ts,
    useFeatureFlag hook); defaults ON.
  - All new user-facing strings need BOTH en.json and km.json entries (Khmer —
    use proper Khmer script, no Thai chars).
  - Typecheck after every change: `npx tsc --noEmit` in the touched
    service/app. Run analytics-service tests with `npx jest --roots ./src`
    (the dist/ test failures are pre-existing stale artifacts — ignore).
  - Don't commit tsconfig.tsbuildinfo or .claude/settings.local.json.
  - Branch off main; commit only when the user asks; end commits with
    `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

DEFINITION OF DONE
  - Repost rendering visually polished and verified in the running app (both a
    bare repost and a quote-repost), light + dark.
  - EduReels: no placeholder media, smooth video play/pause on scroll, verified
    on device/simulator.
  - Feed reactions verified end-to-end in the running app.
  - All touched projects typecheck clean; new strings bilingual.
  - Update the project_v2_engagement_roadmap.md memory with what changed.

Start by reading the memory + docs, then run the app and reproduce the repost
screen before changing anything. Ask the user to confirm the repost redesign
direction (tight quote-tweet style) before implementing if anything is ambiguous.
```
