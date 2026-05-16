# Learning Gamification & Quiz Analytics (May 2026)

**Last updated:** May 16, 2026

This document summarizes the learner engagement tier (mobile + analytics-service + notification-service) and the teacher quiz analytics dashboard (web + feed-service).

## Mobile — learner experience

### Learning streak card
- Feed-style `LearningStreakCard` on Feed and Profile (performance tab).
- Weekly activity dots, milestone progress, streak-at-risk state, and freeze CTA when freezes are available.
- Single source of truth via `performanceStatsCache` + `useLearnerStats` hook.

### Stats & quiz completion
- `GET /stats/:userId/summary` returns `longestStreak`, `weekActivity`, `studiedToday`, `streakAtRisk`, `freezesAvailable`, `lastQuizDate`.
- `POST /streak/update` and `POST /streak/freeze` return the same calendar fields for instant UI updates.
- Quiz submit awaits streak/stats update and invalidates joined-quizzes cache.

### My Joined Quizzes
- Screen: `apps/mobile/src/screens/quiz/MyJoinedQuizzesScreen.tsx`
- Shared card: `apps/mobile/src/components/quiz/QuizListCard.tsx`
- API: `GET /quizzes/my-joined` with 45s client cache (`joinedQuizzesCache.ts`).
- List payload omits full `questions[]` (uses `questionCount` only) for faster loads.
- Search bar and filter chips use fully rounded (pill) styling; card copy uses higher-contrast meta/description text.

### Leaderboard & reminders
- Learning-streak leaderboard tab: `GET /leaderboard/learning-streak` (analytics-service).
- Local evening reminder via `streakReminders.ts` + `NotificationContext` (Expo notifications).
- Server push job for streak-at-risk (see Deployment below).

## Web — teacher quiz analytics

### Dashboard
- Route: `/[locale]/teacher/quizzes/analytics`
- API client: `apps/web/src/lib/api/teacherQuizzes.ts`
- Overview, attempts-over-time chart, per-quiz table, hardest-questions panel, recent attempts / quiz drill-down.
- Period filters: `7d`, `30d`, `90d`, `all`.
- Class filter: `?classId=` scopes attempts to learners in a class the teacher teaches.
- CSV export: `apps/web/src/lib/teacherQuizAnalyticsExport.ts`

### Navigation & feed links
- Profile menu and School sidebar → **Quiz Analytics** (teacher/admin/staff roles).
- Feed: author **View analytics** on quiz posts opens the dashboard; quiz cards show **Quiz analytics** link.
- Deep link: `?quizId=` auto-selects a quiz on the dashboard.

## Backend APIs

| Service | Endpoint | Purpose |
|---------|----------|---------|
| analytics-service | `GET /stats/:userId/summary` | Fast learner stats + streak calendar |
| analytics-service | `POST /streak/update`, `POST /streak/freeze` | Streak mutations with calendar payload |
| analytics-service | `GET /leaderboard/learning-streak` | Streak leaderboard |
| feed-service | `GET /quizzes/my-joined` | Joined quizzes list (lightweight) |
| feed-service | `GET /quizzes/teacher/analytics?period=&classId=` | Teacher rollup |
| feed-service | `GET /quizzes/:id/attempts` | Per-quiz attempt detail (author) |
| notification-service | `POST /notifications/jobs/streak-at-risk` | Cron: evening push for at-risk streaks |

Shared utilities: `services/analytics-service/src/utils/streakCalendar.ts`, `services/feed-service/src/utils/teacherQuizAnalytics.ts`, `services/feed-service/src/utils/teacherClassScope.ts`.

## Deployment notes

### Notification service
Redeploy after pulling this branch so production serves `/notifications/jobs/streak-at-risk`:

```bash
./scripts/deploy-cloud-run.sh notification-service
```

### Cloud Scheduler (streak-at-risk)
Script: `scripts/setup-streak-at-risk-scheduler.sh`

```bash
export GCP_PROJECT_ID="stunity-enterprise"
export GCP_REGION="us-central1"
export NOTIFICATION_SERVICE_URL="https://stunity-notification-service-mc7wnjp2kq-uc.a.run.app"
export NOTIFICATION_SERVICE_AUTH_TOKEN="<same as JWT_SECRET or NOTIFICATION_SERVICE_AUTH_TOKEN on Cloud Run>"
./scripts/setup-streak-at-risk-scheduler.sh
```

Default schedule: daily **19:00** `Asia/Phnom_Penh`. Job name: `stunity-streak-at-risk-evening`.

Manual test:

```bash
gcloud scheduler jobs run stunity-streak-at-risk-evening --location=us-central1 --project=stunity-enterprise
```

### Feed service
Redeploy when using teacher analytics or joined-quizzes API changes:

```bash
./scripts/deploy-cloud-run.sh feed-service
```

## i18n

- Mobile: `quiz.myJoined.*`, streak strings in `en.json` / `km.json`.
- Web: `teacherQuizAnalytics` namespace; feed `postCard.viewQuizAnalytics`.

## Local development

`./quick-start.sh` starts all sixteen microservices (ports `3001`–`3014`, `3018`, `3020`) plus the web app on `3000`. It:

- Loads root `.env` and exports `NOTIFICATION_SERVICE_AUTH_TOKEN` (falls back to `JWT_SECRET`)
- Sets canonical `*_SERVICE_URL` values for cross-service calls
- Smoke-tests notification streak-at-risk job, analytics health, and feed health after startup

## Optional follow-ups

- Class-scoped analytics tied to gradebook / homeroom only.
- Link from web post detail page (not only feed card).
- Move streak push copy to translation bundles on notification-service.
