# 🚀 Stunity Enterprise — Implementation Roadmap

**Version:** 22.0 | **Updated:** February 20, 2026

> This document is the authoritative roadmap. Each item has enough context for a developer to implement it immediately after reading. Read DEVELOPER_GUIDE.md first.

---

## 🔴 Priority 1 — Critical / Blocking

### P1-A: DB Migration — SHARE Notification Type
**Why:** `postActions.routes.ts` already creates `{ type: 'SHARE' }` notifications (added for repost), but this value isn't in the production DB enum yet.

**Action:** Run once on Supabase production via SQL editor:
```sql
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SHARE';
```

---

### P1-B: Web Feed — Quiz Post Card
**Why:** Mobile renders a full quiz card (questions count, time limit, take quiz button, previous attempt). Web PostCard only shows a `from-purple-500` badge with the post title.

**File:** `apps/web/src/components/feed/PostCard.tsx`

**What to add:** Inside the `post.postType === 'QUIZ'` section (currently just shows type badge):
```tsx
{post.postType === 'QUIZ' && post.quizData && (
  <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50 p-4">
    <div className="flex gap-4 text-sm text-purple-700 mb-3">
      <span>📝 {post.quizData.questions?.length ?? 0} questions</span>
      <span>⏱ {post.quizData.timeLimit ?? 0} min</span>
      <span>🎯 Pass: {post.quizData.passingScore ?? 0}%</span>
    </div>
    <a href={`/quiz/${post.id}`} className="block text-center bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 rounded-lg">
      Take Quiz
    </a>
  </div>
)}
```

---

### P1-C: Push Notifications (FCM / APNs)
**Why:** In-app bell works. But when app is closed, users miss likes, comments, reposts, grade updates.

**Files to modify:**
- `services/notification-service/src/index.ts` — already has FCM scaffold
- `apps/mobile/src/stores/notificationStore.ts` — add `registerDeviceToken()` 
- `apps/mobile/App.tsx` — request permissions + get Expo push token on startup

**Steps:**
1. Install: `expo install expo-notifications`
2. In `App.tsx` on launch: `Notifications.getExpoPushTokenAsync()` → send token to `auth-service` via `PUT /users/device-token`
3. `auth-service`: Store `deviceToken` on `User` model
4. `notification-service`: On `Notification` INSERT trigger → read recipient's `deviceToken` → call Expo Push API: `https://exp.host/--/api/v2/push/send`

**Note:** Expo Push Service handles both FCM (Android) + APNs (iOS) with one API — no need for separate FCM/APNs integration during development.

---

## 🟡 Priority 2 — Important Enhancements

### P2-A: Web Feed — Repost Button
**Why:** Mobile has a full repost flow. Web has a "Share" button that only copies a link.

**File:** `apps/web/src/components/feed/PostCard.tsx`

**What to add:** In the actions row, replace/augment the Share button:
```tsx
const handleRepost = async () => {
  await fetch(`${FEED_SERVICE}/posts/${post.id}/repost`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ type: 'REPOST' })
  });
  // update repostCount in local state
};
```

---

### P2-B: Web Feed — Real-time Comments
**Why:** Web comments are loaded once. Mobile gets real-time updates via Supabase Realtime.

**File:** `apps/web/src/components/feed/PostCard.tsx`

**What to add:** In the component, after comments are loaded:
```ts
import { createClient } from '@supabase/supabase-js';

useEffect(() => {
  const channel = supabase.channel(`comments-${post.id}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'Comment',
      filter: `postId=eq.${post.id}`
    }, (payload) => {
      setComments(prev => [...prev, payload.new as Comment]);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [post.id]);
```

---

### P2-C: Web CreatePostModal — Quiz & Course Post Types
**Why:** Mobile supports 7 post types. Web `CreatePostModal` only has: Text, Poll, Announcement, Question, Project. Missing: **Quiz, Course, Exam**.

**File:** `apps/web/src/components/feed/CreatePostModal.tsx`

**What to add for QUIZ:**
```tsx
// Add to POST_TYPES array:
{ id: 'QUIZ', label: 'Quiz', icon: HelpCircle, description: 'Test knowledge', color: 'purple' }

// Add quiz fields state:
const [quizQuestions, setQuizQuestions] = useState([{ text: '', options: ['', ''], answer: 0 }]);
const [quizTimeLimit, setQuizTimeLimit] = useState(10);
const [quizPassingScore, setQuizPassingScore] = useState(70);

// Add quiz fields UI block (rendered when postType === 'QUIZ')
// On submit: include quizData: { questions: quizQuestions, timeLimit, passingScore }
```

---

### P2-D: School → Feed Notification Bridge
**Why:** Grade service already notifies parents via push. But students don't see their own grade notification in-app via the bell. Same for attendance alerts to students.

**grade-service changes** (`services/grade-service/src/index.ts`):
After creating a grade, also call feed-service to create an in-app notification:
```ts
// After prisma.grade.create() succeeds:
await fetch(`${FEED_SERVICE_URL}/notifications`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-internal-key': INTERNAL_KEY },
  body: JSON.stringify({
    recipientId: studentUserId,
    type: 'GRADE_UPDATE',
    title: `Grade posted: ${subject}`,
    body: `You received ${gradeValue} in ${subject}`,
    data: { gradeId, subjectId }
  })
});
```
Supabase Realtime then delivers this to the student's bell badge automatically (already wired up in `notificationStore.subscribeToNotifications`).

---

### P2-E: Enterprise SSO Backend
**Why:** UI is ready (Enterprise SSO screen in mobile and web). Backend connection to Azure AD / Google Workspace not implemented.

**Files:**
- `services/auth-service/src/index.ts` — add `/auth/sso/azure` + `/auth/sso/google-workspace` routes
- Use `passport-azure-ad` (Azure AD) or `passport-google-oauth20` (Google Workspace)
- On successful OAuth: look up user by email → issue Stunity JWT → same session flow

---

## 🟢 Priority 3 — Polish & Growth

### P3-A: Video Post Support
**Why:** Posts currently support images only. Video is critical for TikTok-style learning content.

**Steps:**
1. Mobile: Add video picker in `CreatePostScreen.tsx` using `expo-image-picker` (video mode)
2. storage-service: Accept video upload → store in R2 → return URL
3. PostCard (mobile + web): Add `VideoPlayer` component (use `expo-video` on mobile, `<video>` on web)
4. Feed: `stripToMinimal` should include `mediaType: 'video'` flag for player decision

### P3-B: FeedRanker Author Affinity Optimization
**Current issue:** `getUserSignals` in `feedRanker.ts` makes a sequential second query to get author data after `like.groupBy`. Minor performance issue.
**Fix:** Pre-compute author affinity scores into `UserFeedSignal` table during background job, read from there instead.

### P3-C: Composite Index for School Feed
Add this index to improve school-scoped feed query performance:
```sql
CREATE INDEX IF NOT EXISTS "Post_authorSchoolId_createdAt_idx" 
  ON "Post" ("authorSchoolId", "createdAt" DESC);
```
Run in Supabase SQL editor.

### P3-D: Web Profile Page Parity
**Why:** Mobile ProfileScreen has: Activity tab, Performance tab (grades/attendance widgets), Achievements grid, Bio edit. Web profile is a simple info card.
**Files:** `apps/web/src/app/[locale]/profile/page.tsx`
**Add:** Tabs for Activity/Performance/Achievements, same data via `GET /users/:id/profile` + `GET /users/:id/analytics`.

### P3-E: Rate Limiting on Write Endpoints
Prevent spam and DDoS on feed-service write endpoints (like, comment, post creation):
```ts
// In services/feed-service/src/index.ts, add:
import rateLimit from 'express-rate-limit';
app.use('/posts', rateLimit({ windowMs: 60000, max: 30 }));        // 30 posts/min
app.use('/posts/:id/like', rateLimit({ windowMs: 60000, max: 100 })); // 100 likes/min
```
Install: `npm install express-rate-limit` in feed-service.

---

## 📋 Quick Reference: Feature Completion Status

| Feature | Mobile | Web | Notes |
|---------|--------|-----|-------|
| Social feed | ✅ | ✅ | Both have real-time new post pill |
| Comments real-time | ✅ | ❌ | Web: loads once, no live updates |
| Repost | ✅ | ❌ | Web has share link only |
| Quiz post card | ✅ | ❌ | Web: label badge only |
| Analytics modal | ✅ | ✅ | Both redesigned with gradient header |
| Stories | ✅ | ✅ | |
| Bookmarks | ✅ | ✅ | |
| Search | ✅ | Partial | Web search UI not fully built |
| Push notifications | ❌ | ❌ | In-app bell works, push on closed app missing |
| SSO (Azure/Google) | UI only | UI only | Backend not connected |
| School management | ✅ | ✅ | Grades, attendance, timetable |
| Grade → feed notification | ❌ | — | Bridge not yet built |
| Video posts | ❌ | ❌ | Images only |
| Live Quiz (Kahoot) | ✅ | — | analytics-service hosts it |
| DM / Messaging | ✅ | Partial | Web exists but limited |
| Clubs | ✅ | Partial | |

---

## 🗄️ One-Time Production Setup Checklist

```bash
# 1. Run SHARE enum migration on Supabase production
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SHARE';

# 2. Add composite index for school feed
CREATE INDEX IF NOT EXISTS "Post_authorSchoolId_createdAt_idx" 
  ON "Post" ("authorSchoolId", "createdAt" DESC);

# 3. Enable Realtime on all required tables in Supabase Dashboard:
# → Database → Replication → enable: Post, Comment, Notification, Like, Story

# 4. Set Cloud Run environment variables (see DEVELOPER_GUIDE.md)

# 5. Set Cloud Run request timeout to 3600s (for SSE)

# 6. Create Cloud Scheduler job: POST /internal/refresh-scores every 5 min
#    (when DISABLE_BACKGROUND_JOBS=true is set on Cloud Run)
```
