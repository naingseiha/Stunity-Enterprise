# Student Identity and Lifecycle Contract

## Why this exists

Stunity stores a school-owned SIS profile before a learner creates a Stunity social account. These are separate lifecycles and must never be inferred from the imported V1 `Student.isAccountActive` flag.

## Sources of truth

| Concern | Source of truth |
| --- | --- |
| School owns a student profile | `Student.recordStatus` |
| Student belongs to an academic year/class | effective `StudentClass` record; temporary `Student.classId` migration fallback |
| Learner has no Stunity account | no linked `Student.user` and no pending link request |
| Learner is waiting for school approval | `SchoolLinkRequest.status = PENDING` |
| Learner has an approved Stunity account | `User.studentId` plus active `SchoolMembership` |
| Login/social account is suspended | `User.isActive = false` or membership `SUSPENDED` |

`Student.isAccountActive` is legacy compatibility data only. New roster, report, directory, messaging and account-status logic must not depend on it.

## Current Svaythom baseline (verified 2026-08-02)

- 1,727 SIS student records
- 1,726 assigned to the 2025–2026 academic year
- 1 active SIS record has no class or enrollment and is intentionally outside the current-year census
- 0 officially linked Student → User accounts
- 51 active, unclaimed student Claim Codes
- 9 pending student school-link requests
- 0 approved student school links
- 674 imported records with legacy reason `បិទបណ្តោះអាសន្ន`; these remain active SIS records
- The 11 legacy-only current students received canonical `StudentClass` rows on 2026-08-02
- Student Directory selected-year summary: 1,726; school-wide active SIS total: 1,727; outside selected year: 1
- All 51 active/unclaimed Claim Codes expired on 2026-07-26 and are currently unusable; reissue is deferred to the controlled student-launch window

## Registration and linking flow

1. School imports or creates the `Student` SIS record.
2. Student creates a General Stunity account after the app is published.
3. Student submits a school Claim Code.
4. Stunity creates a pending `SchoolLinkRequest`; it does not modify academic records.
5. School admin approves the request.
6. Approval links `User.studentId`, creates/activates membership and unlocks school context.

## Deployment order

1. Back up and verify the target database.
2. Verify migration `20260802150000_separate_student_record_lifecycle` is recorded as complete.
3. Deploy Academic API and any enabled legacy academic services.
4. Deploy Web.
5. Verify dashboard and directory show 1,726 for academic year 2025–2026.
6. Verify account badges show `NOT_REGISTERED` except the nine pending requests.
7. Confirm the scoped rollout report remains at 1,726 canonical rows and zero fallback-only students for Svaythom.
8. Remove the legacy class fallback only in a later release after every active school reports zero fallback-only students.

The directory API must return academic-year and school-wide totals as separate fields. Selecting a class may narrow the result rows, but it must not change the year-wide summary or classify students in other classes as outside the academic year.

The migration is additive. It marks only records whose reason is exactly `Archived from student directory` as archived; imported temporary-closure values remain active.

The scoped apply on 2026-08-02 inserted 11 enrollment rows and passed post-commit verification: canonical 1,726, fallback-only 0, conflicts 0 and duplicate effective enrollments 0.
