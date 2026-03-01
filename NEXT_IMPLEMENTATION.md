# 🚀 Stunity Enterprise — Implementation Roadmap

**Version:** 23.1 | **Updated:** March 1, 2026

> This document is the authoritative roadmap. Each item has enough context for a developer to implement it immediately after reading. Read DEVELOPER_GUIDE.md first.

---

## ✅ Recently Completed (v23.1 — March 1, 2026)

### Parent Portal Mobile App
- ✅ ParentLoginScreen, ParentNavigator, ParentHomeScreen, ParentChildScreen
- ✅ ParentChildGradesScreen, ParentChildAttendanceScreen, ParentChildReportCardScreen
- ✅ RootNavigator routes PARENT role to ParentNavigator
- ✅ Auth verify returns children for PARENT users
- ✅ Welcome screen: Parent Portal + Enterprise SSO buttons (card layout, scroll fit)
- ✅ Parent Portal back button matches Register/Login standard (chevron-back, white, shadow)

### Auth Enhancements (Facebook-style)
- ✅ Registration: email OR phone (at least one); organization optional
- ✅ Login: single "Email or Phone" field (mobile + web); backend accepts either
- ✅ Session persists until logout (Remember me checkbox removed)
- ✅ Backend: POST /auth/register and POST /auth/login accept email or phone

---

## ✅ Recently Completed (v23.0)

### Auth Security Foundation
- ✅ Helmet + HPP security headers (auth-service + feed-service)
- ✅ Rate limiting — 6 endpoint-specific limiters
- ✅ Brute force protection — progressive lockout
- ✅ Password policy — 8+ chars, complexity, common password block, history check
- ✅ JWT hardening — 1h access, 7d refresh, bcrypt 12

### Password Reset Flow
- ✅ Backend: forgot-password, reset-password, change-password endpoints
- ✅ Pluggable email — Resend (prod) / console.log (dev)
- ✅ Mobile: ForgotPasswordScreen + ResetPasswordScreen
- ✅ Web: forgot-password + reset-password pages (with strength indicators)

### OAuth2 Social Login
- ✅ Backend: Google, Apple, Facebook, LinkedIn providers
- ✅ Account linking/unlinking, graceful 501 when env not configured
- ✅ Mobile: OAuth-ready buttons, Web: social login icon buttons
- ✅ DB: SocialAccount model in Prisma schema

### Two-Factor Authentication (2FA)
- ✅ TOTP-based (Google Authenticator compatible)
- ✅ 10 backup codes (individually bcrypt-hashed, one-time use)
- ✅ Mobile: TwoFactorScreen (6-digit input with paste + backup code toggle)
- ✅ Web: Auth API functions (setup, verify, disable)
- ✅ DB: TwoFactorSecret + LoginAttempt models

### Priority 4: Re-theming Screens
- [x] Priority 4-A: Redesign Create Post screen to match premium styling (modals, cleaner inputs, less clutter).
- [x] Priority 4-B: Refine Advanced Options in Create Post to a Setting List UI layout to match SettingsScreen.

### Feed & Web Enhancements
- ✅ Web CreatePostModal: Course builder + Exam builder
- ✅ Web repost button (already implemented)
- ✅ Web real-time comments via SSE
- ✅ Feed-service security (helmet, hpp, write/upload rate limiters)
- ✅ School→Feed notification bridge (/notifications/student, /notifications/batch)
- ✅ Grade/attendance services notify students AND parents
- ✅ Push notifications (Expo Push with FCM/APNs)
- ✅ Web profile: Activity tab with XP, Level, Streak, Learning Hours, completeness bar
- ✅ FeedRanker author affinity (6-factor model with interaction history)
- ✅ Composite DB index for school feed queries

---

## 🔴 Priority 1 — Critical / Blocking

### P1-A: DB Migration — SHARE Notification Type
**Why:** `postActions.routes.ts` already creates `{ type: 'SHARE' }` notifications (added for repost), but this value isn't in the production DB enum yet.

**Action:** Run once on Supabase production via SQL editor:
```sql
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SHARE';
```

---

### ~~P1-B: Web Feed — Quiz Post Card (Full UI)~~ ✅ DONE
Already implemented in PostCard.tsx: question count, time limit, passing score stats, previous attempt result, Take Quiz / Retake Quiz button.

---

## 🟡 Priority 2 — Important Enhancements

### ~~P2-A: Web Feed — Repost Button~~ ✅ DONE
Already implemented — full repost-as-post on web.

---

### ~~P2-B: Web Feed — Real-time Comments~~ ✅ DONE
Already working via SSE with exponential backoff reconnection.

---

### ~~P2-C: Web CreatePostModal — Quiz & Course Post Types~~ ✅ DONE
Course builder (title, modules, difficulty, hours) and Exam builder (questions, time limit, passing score, max attempts) added.

---

### ~~P2-D: School → Feed Notification Bridge~~ ✅ DONE
- `/notifications/student` and `/notifications/batch` endpoints in auth-service
- Grade-service and attendance-service now notify students directly (not just parents)

---

### ~~P2-E: Enterprise SSO Backend~~ ✅ DONE
**Why:** UI is ready (Enterprise SSO screen in mobile and web). Backend connection to Azure AD / Google Workspace not implemented.
**Status:** Backend successfully integrated with `passport-azure-ad` and `passport-google-oauth20`. `auth-service` auto-provisions `SOCIAL_ONLY` accounts and issues Stunity JWTs.

---

## 🟢 Priority 3 — Polish & Growth

### ~~P3-A: Video Post Support~~ ✅ DONE
**Why:** Posts currently support images only. Video is critical for TikTok-style learning content.
**Status:** `feed-service` `multer` buffers increased to 50MB and accept video MIME types. R2 storage properly bypasses WebP compression for `.mp4`/`.mov`. Mobile UI `VideoPlayer` and `expo-image-picker` fully operational.

### ~~P3-B: FeedRanker Author Affinity Optimization~~ ✅ DONE
Already implemented — full 6-factor model with interaction history (0–0.4 boost).

### ~~P3-C: Composite Index for School Feed~~ ✅ DONE
Added composite index `[authorId, visibility, createdAt]` on Post model in Prisma schema.

### ~~P3-D: Web Profile Page Parity~~ ✅ DONE
Activity tab with XP, Level, Streak, Learning Hours, profile completeness bar, longest streak.

### ~~P3-E: Rate Limiting on Write Endpoints~~ ✅ DONE
Feed-service: 30/min write limiter, 20/5min upload limiter. Auth-service: 6 distinct limiters.

### ~~P3-F: Web Search UI~~ ✅ DONE
Header wiring to `app/[locale]/search/page.tsx` with unified tabs for Posts and Users.

### ~~P3-G: Feed Scroll Optimizations~~ ✅ DONE
`React.memo` deep equality check across all `PostCard.tsx` props, dramatically reducing native layout jank on scrolling in development mode.

### ~~P3-H: Post Button Spacing~~ ✅ DONE
Adjusted internal padding and margins on Quiz and Club post action buttons. Fixed a significant UI oversight by injecting missing generic CTA buttons (e.g. "Enroll Now", "View Project") directly into the post body for non-quiz educational posts.

### ~~P3-I: Navigation Stack Animations~~ ✅ DONE
Added explicit `slide_from_right` transitions and swipe-to-go back gestures to all `createNativeStackNavigator` configurations across the `.tsx` navigational trees.

---

## 📋 Quick Reference: Feature Completion Status

| Feature | Mobile | Web | Notes |
|---------|--------|-----|-------|
| Social feed | ✅ | ✅ | Both have real-time new post pill |
| Comments real-time | ✅ | ✅ | Web uses SSE with reconnection |
| Repost | ✅ | ✅ | Full repost-as-post on both |
| Quiz post card | ✅ | 🟡 | Web: badge only (full card next) |
| Course/Exam post forms | ✅ | ✅ | CreatePostModal has full builders |
| Analytics modal | ✅ | ✅ | Both redesigned with gradient header |
| Stories | ✅ | ✅ | |
| Bookmarks | ✅ | ✅ | |
| Search | ✅ | ✅ | Combined Users + Posts layout |
| Push notifications | ✅ | — | Expo Push (FCM/APNs) |
| OAuth2 social login | ✅ | ✅ | Backend ready, env vars needed |
| 2FA/MFA | ✅ | ✅ | TOTP + backup codes |
| Password reset | ✅ | ✅ | Email flow (Resend/console) |
| Security headers | — | — | Helmet + HPP on auth + feed |
| Rate limiting | — | — | 6 endpoint-specific limiters |
| SSO (Azure/Google) | ✅ | ✅ | Backend connected (passport) |
| School management | ✅ | ✅ | Grades, attendance, timetable |
| Grade → student notify | ✅ | — | Bridge + push notification |
| Profile (full) | ✅ | ✅ | XP, Level, Streak, completeness |
| Video posts | ✅ | ✅ | Both mobile and web; CreatePostModal + MediaGallery support video |
| Live Quiz (Kahoot) | ✅ | — | analytics-service hosts it |
| DM / Messaging | ✅ | Partial | Web exists but limited |
| Clubs | ✅ | Partial | |
| Dark mode | ✅ | ✅ | Mobile: Settings toggle; Web: Nav bar Moon/Sun toggle |

---

## 🗄️ One-Time Production Setup Checklist

```bash
# 1. Run SHARE enum migration on Supabase production
#    Use: scripts/migrations/add-share-notification-type.sql
#    Or run directly: ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SHARE';

# 2. Apply Prisma schema changes (new models + indexes)
#    Run when Supabase DB is reachable:
npx prisma db push

# 3. Enable Realtime on all required tables in Supabase Dashboard:
# → Database → Replication → enable: Post, Comment, Notification, Like, Story

# 4. Set Cloud Run environment variables (see DEVELOPER_GUIDE.md)
#    NEW env vars for OAuth2:
#    - GOOGLE_CLIENT_ID
#    - APPLE_SERVICE_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY
#    - FACEBOOK_APP_ID, FACEBOOK_APP_SECRET
#    - LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
#    - RESEND_API_KEY (for password reset emails)

# 5. Set Cloud Run request timeout to 3600s (for SSE)

# 6. Create Cloud Scheduler job: POST /internal/refresh-scores every 5 min
#    (when DISABLE_BACKGROUND_JOBS=true is set on Cloud Run)
```
