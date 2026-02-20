# 🏫↔️📱 School Management + Social Feed Integration

**Version:** 1.0 | **Updated:** February 20, 2026

> How school management data connects to the social feed. Critical reading for any developer bridging these two halves of the app.

---

## Architecture: Two Halves, One Platform

```
┌──────────────────────────────┬──────────────────────────────┐
│   SCHOOL MANAGEMENT          │   SOCIAL FEED                │
│                              │                              │
│  school-service (3002)       │  feed-service (3010)         │
│  student-service (3003)      │  analytics-service (3014)    │
│  teacher-service (3004)      │  club-service (3012)         │
│  class-service (3005)        │  messaging-service (3011)    │
│  grade-service (3007)        │                              │
│  attendance-service (3008)   │                              │
│  timetable-service (3009)    │                              │
└──────────────┬───────────────┴──────────────┬───────────────┘
               │                              │
               └──────── PostgreSQL ──────────┘
                      (Supabase — shared DB)
```

All services share **one PostgreSQL database** via Supabase. They are logically separate but can read each other's tables via the shared Prisma client in `packages/database`.

---

## What's Already Integrated

### 1. School-Scoped Feed
Every post has `authorSchoolId`. The feed algorithm's Pool 1 (relevance, 60%) prioritizes posts from the user's own school:
```ts
// In feedRanker.ts — relevance pool:
{ author: { schoolId: req.user.schoolId } }
```
Users see their school community's posts first.

### 2. Class/Subject Post Visibility
Posts can target a specific class:
```
Post.visibility = 'CLASS'
Post.classId = 'cls_xxx'
```
Only students in that class see the post. Used for teacher announcements and assignment posts.

### 3. Grade → Parent Notification
`grade-service` calls `auth-service/notifications/parent` after each grade entry:
```ts
// grade-service/src/index.ts ~line 422:
await sendParentNotification(studentId, 'Grade Posted', `You received ${grade} in ${subject}`);
```
Parents receive push + in-app bell notification.

### 4. Attendance → Parent Notification
Same pattern in `attendance-service/src/index.ts ~line 403`:
```ts
// For absent/late students:
await sendParentNotification(studentId, 'Attendance Alert', `${studentName} was marked absent`);
```

### 5. Achievement System
`analytics-service` awards XP for academic + social actions. Achievements appear in the user's profile feed.

---

## What's NOT Yet Integrated (Planned — P2-D)

### Grade → Student Bell Notification
Currently only parents get grade notifications. Students don't see "You got 95% in Math" in their feed bell.

**How to add:**
After `prisma.grade.create()` in `grade-service`, POST to feed-service's internal notification API:
```ts
await fetch(`${FEED_SERVICE_URL}/internal/notifications`, {
  method: 'POST',
  headers: { 'x-internal-key': process.env.INTERNAL_KEY },
  body: JSON.stringify({
    recipientId: student.userId,  // student's social user ID
    type: 'GRADE_UPDATE',
    title: `Grade posted`,
    body: `${grade} in ${subject}`
  })
});
```
Supabase Realtime on `Notification` table immediately delivers to student's app.

### Assignment Due → Reminder Post
When teacher creates assignment with due date, a scheduled `Notification` could appear in the student's feed 24h before due.

### Attendance Streak → Feed Achievement
When a student completes 10 consecutive present days, `attendance-service` could trigger `analytics-service` to award an "Attendance Streak" badge that shows in the feed.

---

## Data Model: The Bridge Points

```
User (social identity)
  ├── schoolId → School (school management)
  ├── Post.authorId = User.id
  └── Post.authorSchoolId = User.schoolId

Student (academic identity)
  ├── userId → User.id  ← links to social profile
  ├── classId → Class
  └── GradeEntries → Grade (notify User via Notification)

Teacher (academic identity)
  ├── userId → User.id  ← same social profile
  └── creates: Assignment, Grade entries, Attendance sessions
```

The `userId` field on `Student` and `Teacher` is the **bridge** — it links academic records to social identity. When a teacher posts to a class, the Post uses their `User.id`. When grades are posted, the notification goes to `Student.userId`.

---

## Real-Time Flow Summary

```
Teacher posts grade
  → grade-service creates Grade row
  → calls auth-service/notifications/parent (push to parent)
  → (TODO) calls feed-service/internal/notifications (bell to student)
    → Notification row created in PostgreSQL
      → Supabase Realtime fires postgres_changes INSERT on Notification
        → notificationStore.subscribeToNotifications picks it up
          → bell badge increments instantly on student's phone
```

---

## Environment Variable: INTERNAL_KEY
For service-to-service calls (grade-service → feed-service), use a shared secret:
```
INTERNAL_KEY=<strong-random-string>  # same across all services
```
In feed-service, verify the header:
```ts
if (req.headers['x-internal-key'] !== process.env.INTERNAL_KEY) {
  return res.status(403).json({ error: 'Forbidden' });
}
```
