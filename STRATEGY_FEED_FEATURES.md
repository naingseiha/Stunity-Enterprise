# Stunity: The "TikTok for Education" Strategy Plan

To make Stunity the only educational platform that users *want* to open every day, we must stop building it like a traditional learning management system (LMS) and start thinking like a social media app. 

Traditional LMS apps push content (assignments, grades). Social media apps pull users in using variable rewards, algorithmic personalization, and social validation. Stunity will masterfully combine both.

Here is the strategic masterplan for implementing our three core hooks to guarantee engagement.

---

## ✅ Foundation: Polymorphic Mixed-Media Feed (DONE)
> **Commit:** `4bc09c6` — merged to `main` (2026-02-22)

The feed now supports mixed `FeedItem` types: `POST`, `SUGGESTED_USERS`, `SUGGESTED_COURSES`.
- `feedRanker.ts` injects suggested users after post #3 and courses after post #7
- `SuggestedUsersCarousel` and `SuggestedCoursesCarousel` render horizontally in feed
- `FlashList` uses `getItemType` for cell-type bucketing and `estimatedItemSize` for 120Hz scroll
- All crash fixes resolved: FlashList recycling null guards, AppState foreground refresh, `overflow: hidden` on card

---

## 1. The Gamified Learning Feed (The "TikTok for Education")

TikTok's success comes from its **For You Page (FYP)**. It doesn't rely on who you follow; it relies on an algorithm that calculates **what keeps your attention**. We will build the "For You" Feed for learning.

### The Algorithm: "Engagement-First Education"
Our ranking algorithm (`feedRanker.ts`) must weight actions that signal deep educational engagement.

*   **Watch Time / Dwell Time:** If a student stares at a Math Question post for 45 seconds trying to solve it, the algorithm learns they are interested in Math Problem Solving and shows them more.
*   **The "Diamond" (Educational Value):** Instead of just "Likes," students give "Diamonds" to posts that actually helped them learn something. A post with a high Diamond ratio is injected into the feed of *other* students taking similar subjects, even if they don't follow the author.
*   **Difficulty Matching:** The feed learns the student's level. If they are failing Calculus, the feed surfaces `BEGINNER` level Calculus tutorials and study group announcements. If they are acing it, it surfaces `ADVANCED` challenge questions.

### The Execution Plan
*   [x] **Feed Infrastructure:** Polymorphic FeedItem types, mixed-media feed rendering ✅
*   [x] **Dwell Time Tracking:** `onViewableItemsChanged` hook tracks 2s+ views per post ✅
*   [ ] **Interest Graph, Not Social Graph:** Update Redis feed cache to prioritize topics/hashtags the user interacts with, overriding chronological following.
*   [ ] **Micro-Learning Format:** Encourage Teachers to post 60-second video explanations directly into the feed, rather than locking them away in 2-hour long Course modules.

---

## 2. Q&A Bounties (The "StackOverflow for Campus")

Students get stuck on homework at 11 PM when teachers aren't available. Stunity will incentivize top students to become 24/7 tutors through gamification.

### The Mechanic: "Learn to Earn"
*   **The Problem:** A student is stuck on Physics. They post a `QUESTION` to the feed and attach a **Bounty** of 100 Diamonds (earned through their own good behavior/streaks).
*   **The Feed Push:** The algorithm immediately pushes this high-bounty question to the top of the feed for students who have a high grade/reputation in Physics.
*   **The Reward:** The best answer is marked as "Verified" by the asker or a teacher. The answerer claims the 100 Diamonds, plus a public badge on their profile (e.g., "Top Physics Helper").

### The Execution Plan
*   [ ] **Bounty Escrow System:** When a question is posted, deduct the diamonds from the user and hold them in escrow until an answer is selected.
*   [ ] **Teacher Endorsements:** Allow teachers to place a "Golden Checkmark" on correct student answers, instantly granting bonus reputation points.
*   [ ] **Reputation Leaderboards:** Add a school-wide leaderboard. "Top Contributors this Week". This drives fierce, healthy competition to help others.

---

## 3. Live Quizzes & Interactive Polls (The "Kahoot" Replacement)

Teachers need tools to wake up a sleepy classroom. We will eliminate the need for third-party apps by building interactive assessments directly into the main feed.

### The Mechanic: "Synchronous Social Learning"
*   **The Broadcast:** A teacher creates a `LIVE QUIZ` post. It sends a push notification: "Mr. Smith's Biology Quiz starts in 2 minutes!" and pins itself to the top of the feed with a pulsing LIVE badge and countdown.
*   **The Experience:** When the countdown hits zero, questions appear synchronously on every student's phone in the classroom. Haptic feedback triggers when answering.
*   **The Climax:** After every question, a live leaderboard updates instantly (via Supabase Realtime/Redis). The top 3 students get a shower of confetti on their screen.

### The Execution Plan
*   [ ] **WebSocket Infrastructure:** Harden the real-time service to ensure 100+ students in a lecture hall receive the next question at the exact same millisecond.
*   [ ] **"Study Mode" vs "Live Mode":** Quizzes can be taken asynchronously for practice (Study Mode) or synchronously in class (Live Mode).
*   [ ] **Post-Quiz Analytics:** Automatically generate a post to the teacher's exclusive feed showing exactly which question 80% of the class failed, so they know what to review.

---

## Why This Works (The "Aha!" Moment)

By combining these three elements, you create a powerful **Flywheel Effect**:

1.  **Teachers** use Live Quizzes (because it's easier than Kahoot) -> 
2.  Forces all **Students** to download the app and open it -> 
3.  Students scroll the personalized **Gamified Feed** while waiting for class -> 
4.  They see **Q&A Bounties** -> 
5.  Smart students answer them to get **Diamonds** and climb the **Leaderboard** -> 
6.  Struggling students finally understand the material.

**Everyone wins. You have built an addictive learning ecosystem.**

---

## 🔲 Next Up (Phase 4)

| Priority | Feature | Effort |
|---|---|---|
| 🔴 High | Interest Graph feed weighting (Redis) | M |
| 🔴 High | Q&A Bounty escrow system | M |
| 🟡 Medium | Reputation leaderboard screen | S |
| 🟡 Medium | Teacher endorsement / golden checkmark | S |
| 🟢 Low | Live Quiz WebSocket infrastructure | XL |
| 🟢 Low | Post-quiz analytics auto-post | M |
| 🟢 Low | 60-second micro-learning video format | L |
