# Stunity v2 — Daily Engagement & Real-World Scale

A pragmatic plan for turning Stunity from a feature-rich app into a daily-use habit, and for running it reliably at the scale that habit creates.

This document deliberately does **not** try to list every feature LinkedIn or TikTok has ever shipped. The goal is to identify the smallest set of changes that make Stunity emotionally addictive without compromising its identity, and to prepare the infrastructure to support 10x-100x current usage. Cross-references existing docs (`stunity-vision/COMPREHENSIVE_FEATURE_ROADMAP.md`, `future-implementation/MASTER_VISION.md`) where they're more detailed.

---

## 1. Where Stunity stands today (honest read)

After working across the whole stack, here is what the app actually is:

**Surfaces shipped:**
- Feed (FOR_YOU / FOLLOWING / BRAIN_MODE) with mixed item types: posts, reels, recall cards, bounties, quiz wars, suggested users/courses/quizzes.
- EduReels — TikTok-style vertical feed with Focus Reels, Quiz Questions, Recall Cards, Bounties.
- Learn — courses with sections/lessons, paths, instructor dashboard, certificates, Q&A, announcements, assignments.
- Clubs — study clubs (CASUAL_STUDY_GROUP / STRUCTURED_CLASS / PROJECT_GROUP / EXAM_PREP) with members, materials, announcements, invites.
- School Classes — full SIS surface: attendance, grades, timetables, assignments, leaderboards, discipline workbench, reports.
- Profile — LinkedIn-shape (skills, experiences, certifications, education, achievements) with profile views, performance scores, recommendations.
- Real-time — Supabase realtime + WebSocket for quiz wars + Redis pub/sub for cross-service events.
- AI service — already wired (ai-service running on its own port).
- Notification + analytics + storage + messaging services.

**What this means in plain English:** Stunity is already four products in a trench coat — a social network, an LMS, a school management system, and a TikTok clone. Each surface is feature-rich. The bottleneck for growth is **not "we need more features"** — it's that the existing features don't yet form a tight daily habit loop.

**The honest gap analysis:**

| What Stunity has | What's missing for "daily-use" engagement |
|---|---|
| Lots of content types | A reason to come back **every day** before opening any other app |
| Robust LMS | A way to make consumption feel like progress, not work |
| TikTok-style reels | A creator economy that gives educators and learners status |
| Profile with achievements | A reason for anyone to ever look at your profile |
| Notification service | Smart, behaviorally-tuned notifications (not just dumb pings) |
| Realtime infrastructure | Synchronous social moments (live classes, study rooms) |
| AI service | AI features users actually feel in their daily flow |

The rest of this document attacks that right-column.

---

## 2. The Six Daily-Use Hooks

Every app that becomes a daily habit triggers at least 3-4 of these emotional hooks per session. Stunity needs to be designed around them explicitly.

| Hook | Emotional driver | Stunity status |
|---|---|---|
| **Identity** | "This represents who I am / want to become" | ⚠️ Profile exists but feels generic |
| **Streak** | "I'd lose something if I miss today" | ⚠️ Has `currentStreak` field but no UI surface |
| **Variable reward** | "Something new might be there" | ✅ Feed + Reels deliver this |
| **Social proof** | "Other people noticed / endorsed me" | ⚠️ Profile views exist; nothing more |
| **Progress** | "I am measurably better than yesterday" | ⚠️ Stats exist but invisible day-to-day |
| **Belonging** | "These are my people" | ⚠️ Clubs exist but feel transactional |

LinkedIn weaponizes Identity + Social Proof. TikTok weaponizes Variable Reward. Duolingo weaponizes Streak + Progress. Discord weaponizes Belonging. **Stunity already has the surfaces to hit all six** — they just aren't tuned for it yet. The next section turns each hook into specific features.

---

## 3. Feature recommendations by hook

Ordered roughly by impact:effort ratio.

### 3.1 Identity — Make profiles worth defending

**Why:** A profile users invest in is a profile they return to. LinkedIn's genius isn't the feed — it's that 200M people maintain a CV for free because the profile became their public-facing identity.

**What to ship:**

1. **Verified educator badges.** Auto-verify via school email domain + manual approval queue. Display a checkmark on profile + every post + every comment. Stunity already has `isVerified` and `verifiedAt` fields — wire them into a verification flow with three tiers (verified student, verified educator, verified institution).
2. **Profile strength meter with daily nudges.** Already have `profileCompleteness` — surface it as a Duolingo-style ring on the home screen. Nudge with specific actions: "Add 3 skills to reach 80%". Hide the nudge once they hit 100% (then it becomes a flex).
3. **Featured work** — pin up to 3 items to the top of profile: a course they created, a recall deck they shared, a bounty they won, a project. This is the Stunity equivalent of LinkedIn's "Featured" section. Every learner wants to display *something*.
4. **Public learning portfolio.** Auto-generate from existing data: certificates earned, courses completed, hours learned, top subjects, recent recall accuracy. Make this shareable via a public URL — `stunity.app/u/seiha` — that works without login. This converts to growth: every share is a recruiting funnel.
5. **Profile themes.** Cosmetic. Three theme presets unlocked at profile-strength milestones (50%, 80%, 100%). Costs nothing engineering-wise; meaningful psychologically.

**Why this works:** Once users have a stake in their profile, **every interaction in the rest of the app becomes content for that profile**. A course completed isn't just learning — it's a brick in a wall they're building.

### 3.2 Streak — Make missing a day feel like losing something

**Why:** Duolingo's #1 retention mechanic is "your N-day streak will end if you skip today". Brutally effective. Stunity already has `currentStreak` and `longestStreak` fields — they're invisible to the user.

**What to ship:**

1. **Streak ring on every screen header.** Small circular indicator that fills based on today's activity. Two states: gray (not yet done today) → green (active). Tap to see what counts.
2. **Definition of "active":** at minimum one of (a) completed a recall review (b) finished a lesson section (c) posted something (d) commented on a post. Keep the bar low — this is the *opening*, not the goal.
3. **Streak Saver:** users earn a "freeze" every 7-day milestone. Limit to one stored. This prevents the catastrophic "missed one day, gave up" pattern. Duolingo's data is unambiguous: streak savers increase retention without reducing daily engagement.
4. **Streak leaderboards** scoped to: your class, your club, your school. Public visibility of streaks within a chosen scope. Driver of social proof + streak both.
5. **Notification timing.** Currently notifications are reactive (someone liked your post). Add proactive streak notifications fired only when (a) user hasn't been active today, (b) it's within 4 hours of streak expiry, (c) user is in their typical active window (learn from notification open data). One per day, max.

**Effort:** Mostly UI work. Backend already has the fields. ~1 sprint for engineer + designer.

### 3.3 Variable reward — Already mostly here, but tune it

**Why:** Feed + Reels deliver this. The risk is that the variable reward becomes predictable (always quizzes, always reels, always the same friends). Need to keep injecting novelty.

**What to ship:**

1. **Daily Reel** — one curated reel per day delivered as a notification. Personalized by subject interest. Resembles Apple's "Today's Feature". Drives a habitual open.
2. **AI-generated recall recommendations** delivered as reels — Stunity already has SM-2 recall infrastructure and an AI service. Combine: when a user has 3+ recall items due in a subject, surface them as a single reel labeled "Catch up: Biology". Higher emotional weight than the existing recall queue.
3. **Bounties feed** — keep these high-impact and timed. Currently bounties feel like an item type buried in feed. Give them a dedicated daily slot at the top of the feed with countdown. Make bounty completion a profile achievement.
4. **"Why am I seeing this?"** — small affordance on every feed card. Tap to see: "Because you follow @x" / "Because 12 classmates engaged" / "Trending in your school". Transparency increases trust and reduces ranker complaints.

### 3.4 Social proof — Make every contribution feel seen

**Why:** "Who viewed your profile" already exists in profile-service. Extend the pattern.

**What to ship:**

1. **Notification aggregation that respects taste.** Bad: "5 people liked your post." Good: "Mr. Sok and 4 other teachers liked your post." Adds social weight. Group by role/relationship rather than just count.
2. **Endorsements on profile.** LinkedIn's skill endorsements — but better: in Stunity, an endorsement should be tied to a *specific course* or *specific class* you took with the endorser. Auto-suggest endorsement opportunities: "You took Math 101 with Sok. Endorse Sok for Algebra?" One-tap endorse. Endorsements display on profile with the context.
3. **Reactions, not just likes.** Add a small set of reactions: like, insightful, celebrate, smart-take. Already common pattern; doubles per-post engagement.
4. **Reposts with quote.** A user reposting an instructor's post with their own commentary is the single most effective acquisition mechanism on professional networks. Stunity already has feed posts — repost-with-quote is mostly UI.
5. **"Top contributor" badges per club.** Computed from posts + replies + materials shared in the last 30 days. Visible inside the club. Cheap reputation system with strong stickiness inside clubs.

### 3.5 Progress — Make learning feel measurable

**Why:** Khan Academy's mastery view, Duolingo's tree, Codecademy's path. Stunity has the data — `totalLearningHours`, `currentStreak`, `totalPoints`, `level`, completed lessons, completed courses — but the user never sees it integrated into a narrative.

**What to ship:**

1. **Weekly progress digest** — a single push notification + in-app card every Sunday: "This week: 3.2 hrs studied, 2 new skills, +120 XP, 4-day streak. You're in the top 18% of your class." Best growth/retention investment LinkedIn made in 2019 was their weekly digest. It IS the feature, not a side feature.
2. **"You vs. last month" comparison.** Subtle: a small graph on the home tab. Studied hours, recall accuracy, posts engaged. Doesn't need to be perfect — needs to exist.
3. **Subject mastery tree.** For each subject the student is taking, show topics as a tree with mastery levels (0-100% per topic based on quiz/recall performance). This is where Stunity diverges from LinkedIn and competes with Khan/Coursera. The data is already there from the recall + quiz systems.
4. **Personal records.** Surface things like "Best 7-day streak: 23", "Highest recall accuracy in Math: 94%", "Most active club: Math Olympiad". One-tap share to feed/profile.

### 3.6 Belonging — Turn clubs into communities

**Why:** Discord and Slack have shown that durable communities are built around small-group synchronous moments. Stunity's clubs feature is well-structured (members, materials, announcements, assignments) but missing the "we're all here right now" beat.

**What to ship:**

1. **Club study rooms.** A persistent voice/text channel per club. Doesn't need full Discord parity — minimum viable is text chat + presence ("3 members online studying"). Voice can be Phase 2 via Daily/LiveKit or similar. The realtime infrastructure exists (Supabase + WebSocket).
2. **Live classes.** Scheduled events inside a club. Push notification 10 min before. Joins via the existing WebSocket layer with screen-share via WebRTC. **Don't build this until you have a club doing 20+ weekly events organically** — premature.
3. **Co-watching reels.** Two students in a club can synchronize a reel playback and chat over it. Tiny feature, huge for stickiness. Tech: just sync currentTime via the WebSocket pub/sub Stunity already has.
4. **Group recall battles.** Two clubs head-to-head in a timed quiz war over shared recall cards. Quiz wars infrastructure already exists; this is a club layer on top.
5. **Mentorship matching inside school.** Teacher opts in. Older students opt in. Algorithm suggests a mentor based on subject + class + schedule. One-tap intro message. This is the #1 thing parents will pay for if Stunity ever monetizes B2C.

---

## 4. Differentiators — Why Stunity, not LinkedIn

LinkedIn is for adults networking for jobs. Stunity needs to be for **students and educators networking for learning**. The differentiation matters because the answer to "why open Stunity instead of LinkedIn?" must be obvious.

The four things only Stunity can credibly do:

1. **Verified school context.** A student's posts/profile are anchored to their school + class. A teacher's are anchored to their institution. Public discourse with verified context is rare on the internet — it's a moat.
2. **Spaced repetition as a social mechanic.** No mainstream social network treats SM-2 review as a daily UX. Make it the centerpiece of the morning notification.
3. **Parents inside the school graph.** Parents see their child's grades, attendance, posts (if shared). This is the moment Stunity becomes a household app, not just a kid app. The parent-service infrastructure exists; the UX needs investment.
4. **Educators as creators.** Make it normal — even rewarded — for a teacher to create reels, recall decks, and short courses for their class. Stunity should be the YouTube for educators, with the audience scoped by trust (school graph) rather than algorithmic broadcast.

Each of these is a strategic moat. Each requires a small set of features the playbook above already addresses.

---

## 5. Real-world performance & scale — beyond this session

The perf work in this session (commits `ca99f3ec` and `7e1f5826`) covered the **client-side perceived perf**: disk cache + prefetch + render-from-cache on every primary tab, plus the connection pool fix. That solved the cold-boot "feels broken" problem. What it didn't solve:

### 5.1 Content delivery

**Problem:** Every reel, every profile photo, every course thumbnail currently fetches through a single origin (R2 via storage-service, or whatever the backing store is). At 100k DAU this saturates egress.

**To do:**
- **CDN in front of media.** Cloudflare R2 is already in use — enable Cloudflare CDN with aggressive edge cache (`Cache-Control: public, max-age=31536000, immutable` on hashed asset names). Hashed URLs are easy: the storage-service should mint URLs that include a content hash so cache busting comes free.
- **Image variants.** Generate `?w=320,640,1280` variants on upload. Mobile requests the right size based on device width and connection (already detected via the `networkQualityService` referenced in feedStore).
- **Video adaptive bitrate.** Reels currently serve a single MP4 URL. At scale this is wasteful. Convert to HLS with 3 quality levels (480p / 720p / 1080p). Use a transcoding pipeline (Mux, Cloudflare Stream, or self-hosted ffmpeg in a queue). Reels TTI improves dramatically on mobile networks.
- **Preconnect + Resource Hints.** Add `<link rel=preconnect>` for CDN origins in the web build (when there is one). For RN, ensure HTTP/2 keepalive is preserved across the api clients.

### 5.2 Push notifications

**Problem:** Stunity currently relies on realtime channels (Supabase + WebSocket) for in-session updates. For users who aren't in-session, there's no way to bring them back. This is the single biggest growth bottleneck.

**To do:**
- **Expo Push** is already available given the Expo-based mobile app. Set up the device-token registration flow (capture token on first launch, store in user-service, refresh on app open).
- **Notification categories** with user opt-in per category: streak reminders, new posts from people you follow, club activity, grade releases, assignment due reminders. Granular opt-in beats blanket on/off; users keep more channels enabled when they feel in control.
- **Notification batching server-side.** Send at most 3 notifications per user per day in non-urgent categories. Use the notification-service to batch within rolling 4-hour windows.
- **Smart timing.** Track open-rate by hour-of-day per user. Send streak reminders in the user's known active window. This is a 2-3x lift on open rate compared to fixed-time sends.

### 5.3 Observability

**Problem:** When something is slow, we currently rely on `console.log` lines that we added during this session. Good for diagnosis; useless at scale.

**To do:**
- **Structured logging.** Replace `console.log('[Reels MISS] ...')` with structured JSON logs (`pino` is already a good fit for the Node services). Pipe to a log aggregator: Grafana Loki, Datadog, or Axiom (Axiom's free tier is generous and ergonomic).
- **Distributed tracing.** OpenTelemetry instrumentation across services. The `Server-Timing` headers added in this session can be promoted to real traces — `traceparent` headers propagated from mobile through gateway through services. Cloudflare Workers Tracing or Honeycomb.
- **RUM (Real User Monitoring).** Sentry or LogRocket on mobile + web. Capture session replay for the slow-path. The `[Reels TTI]`, `[Learn TTI]` logs we wrote should be sent to RUM, not just stdout.
- **SLO dashboard.** Define a North-Star SLO: "Cold reopen renders cached content within 1s for 99% of warm users". Track it weekly. Anything below the bar gets prioritized.

### 5.4 Resilience

**Problem:** If feed-service goes down, the app shows blank screens. If learn-service is degraded, the Learn tab spins. The disk cache layer we just shipped helps for cold reopens but not for users actively using the app when an outage hits.

**To do:**
- **Circuit breakers** at the mobile API client layer. If a service times out 3x in 60s, short-circuit calls to it for the next 60s and serve cached data. Already partially in place via the per-API timeouts; needs explicit circuit logic.
- **Graceful degradation in feed-service ranker.** When the ranker's pool queries time out (we saw this in the cold-boot logs as `[FeedRanker] explore pool timed out`), the ranker already returns fallback. Extend this to a "lite ranker" mode that runs with 50% fewer pool queries when load is high. Detect load via a request-rate counter.
- **Read-replica routing audit.** This session moved learn-hub and clubs to `prismaRead`. Audit feed-service profile routes and the remaining controllers to ensure no read-only path is on the primary pool. Primary should be reserved for writes only at the architecture level.
- **Idempotent writes.** Engagement actions (like, follow, attendance check-in) should be idempotent so retries from flaky mobile networks don't double-record. Most are; needs audit.

### 5.5 A/B testing

**Problem:** Every recommendation in this document is a hypothesis. You will be wrong about half of them. Without an A/B framework, you'll never know which half.

**To do:**
- **GrowthBook or PostHog** (both have generous free tiers, both work with React Native and Node). Feature flags + experiment definition + statistical analysis in one tool.
- **Wrap every new engagement feature in a flag.** Streak ring? Flag. Endorsement nudges? Flag. Weekly digest? Flag. Roll out to 10% → measure → 50% → measure → 100%.
- **Define guardrail metrics.** A/B tests should fail-safe. If the streak feature increases DAU but drops content quality (fewer posts per user), it's not a win. Track both.

### 5.6 Cost

**Problem:** Stunity runs ~12 microservices + Supabase + Redis + R2 + a transcoding pipeline (when added). The cost curve at 10k DAU is manageable; at 1M DAU, it's not.

**To do:**
- **Audit per-DAU cost monthly.** Supabase row reads are the most likely silent killer. The `[Learn metrics]` style logs you have now make this measurable.
- **Read replicas before connection pool bumps.** Connection pool 20 was the right move for this session, but at scale the right answer is a dedicated read replica (`DATABASE_READ_URL`) and a tighter primary pool. The code already supports this — set the env var.
- **Aggressive Redis caching of ranker output.** The ranker outputs that don't depend on user-specific state (trending pool, explore pool) can be shared across all users in the same school. Cache key by `school:trending:1h-bucket`. One ranker run per school per hour instead of per user.
- **Cold-storage old reels.** Reels older than 90 days that haven't been viewed in 30 days can move to a cheaper R2 storage class. Re-promote to standard on first re-view.

---

## 6. The 90-day roadmap

This is opinionated. Skip what doesn't apply.

### Sprint 1-2 (weeks 1-4) — Identity & Streak
The two highest-leverage hooks, both mostly UI work, both unlock the rest.

- [ ] Profile strength meter with daily nudges (UI + 1 endpoint)
- [ ] Streak ring + streak saver mechanic + scoped leaderboards
- [ ] Verified educator badge program (manual approval queue in admin panel)
- [ ] Public profile URL (`stunity.app/u/{username}`) — generates from existing profile data
- [ ] Weekly digest push notification + in-app weekly card
- [ ] Expo Push tokens registered + per-category opt-in screen

### Sprint 3-4 (weeks 5-8) — Social proof & Progress
Tighten the loops. Make every contribution feel noticed.

- [ ] Reactions beyond like (insightful, celebrate, smart-take)
- [ ] Repost-with-quote
- [ ] Endorsements (one-tap, context-anchored)
- [ ] Subject mastery tree (uses existing recall + quiz data)
- [ ] Notification aggregation by relationship ("Mr. Sok and 4 teachers")
- [ ] GrowthBook integration + first 3 features flagged

### Sprint 5-6 (weeks 9-12) — Belonging & Real-world scale
The trickier work. Communities + production-readiness.

- [ ] Club study rooms (text chat + presence first; voice deferred)
- [ ] Mentorship matching MVP (opt-in, suggest top 3 mentors)
- [ ] CDN in front of all media (Cloudflare R2 + variant generation)
- [ ] Structured logging + Axiom integration
- [ ] OpenTelemetry tracing through 3 main services (feed, learn, club)
- [ ] First A/B test (streak ring on/off) — measure impact on 7-day retention

### What's NOT in the 90-day plan, on purpose

- **Job board / opportunities.** It's tempting because LinkedIn has one. But this is a focus dilutor at the current stage. Revisit after the daily-use hooks are in.
- **Live classes with video.** Too expensive to build until there's organic demand from clubs doing weekly study sessions.
- **Web app.** Mobile-first is the right bet for the target user (students). Web can be Phase 4 once mobile DAU is meaningful.
- **AI tutor / chatbot.** The AI service is wired but a chatbot is a feature in search of a problem at this stage. Use AI to enhance existing features (recall ranking, content moderation, auto-tags) rather than build a new surface.
- **Monetization.** Wait until DAU is meaningful. The right first monetization is institutional (B2B school licensing), not consumer subscriptions. Don't introduce a paywall before you have the engagement to make it worth charging for.

---

## 7. Metrics that matter

If you measure everything you measure nothing. These are the four metrics that should be on the wall.

### 7.1 North-star

**Weekly Active Days per Monthly Active User (WAD/MAU).**
- Target: 4.5 within 90 days, 5.5 within 6 months.
- Interpretation: a user who opens Stunity 4.5 days a week is forming a habit; one who opens 5.5 is using it more than they use Instagram.
- This is downstream of every hook in section 2. If WAD/MAU is rising, the strategy is working.

### 7.2 Top-of-funnel

**Profile completeness ≥ 80% within first 7 days, % of new users.**
- Target: 60%+.
- Why: a user who completes their profile in week 1 has materially higher long-term retention. Identity hook strength.

### 7.3 Engagement loops

**% of DAU who completed at least one recall review.**
- Target: 40%+.
- Why: recall is the highest-intent action in Stunity. If users are doing it daily, the learning + streak loops are working.

### 7.4 Anti-metric

**Notifications sent per user per day.**
- Target: ≤ 3.
- Why: easy to juice engagement by spamming notifications. Hard cap forces the team to make each notification earn its place. Quality over quantity always wins long-term.

---

## 8. What I'd do if I had to pick ONE thing

If only one thing from this document gets shipped in the next 30 days, ship **the weekly progress digest** (section 3.5, point 1).

Reasoning:
- It uses data Stunity already collects.
- It runs entirely on the backend (one cron job) with one notification.
- It compounds the streak + social proof + progress hooks in a single touch.
- It's the single most measurable retention investment LinkedIn has ever made.
- It costs ~1 sprint of engineering effort.

Everything else in this document supports that one feature. Profile strength meter makes the digest data richer. Streak ring makes the digest's streak number meaningful. Endorsements make the digest's "12 people endorsed you" line possible. Build the digest first; the rest pulls itself along.

---

## 9. Closing note — what success looks like

If this plan works, in 6 months the user opens Stunity in the morning to:
1. See their streak ring on the home screen.
2. Knock out the 5 recall cards due today (3 min).
3. Get a notification that their physics teacher endorsed them for "Mechanics".
4. See a reel from a senior student in the same exam-prep club explaining a concept they're struggling with.
5. Notice their weekly digest landed on Sunday: they studied 4.2 hrs this week, are in the top 12% of their class for engagement, and earned a Verified Learner badge.

At no point did they consciously decide to engage. The product designed each step. That's the difference between an app users have on their phone and an app users open daily.

---

**Maintainer:** This doc should be reviewed quarterly. Strike through what's done, add what's been learned, archive what's been rejected. Living document, not a museum piece.
