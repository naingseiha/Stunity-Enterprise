# Student Lifecycle Rollout Runbook

## Objective

Move the current academic-year census completely onto `Student.recordStatus` and `StudentClass` without changing Stunity account/link state. The rollout is scoped to one school and one academic year at a time.

## Safety properties

- The checker is read-only unless `--apply` is supplied.
- A write requires both `ALLOW_STUDENT_LIFECYCLE_BACKFILL=1` and the exact confirmation phrase.
- The apply command is also protected by `scripts/db-safety-check.ts`.
- The backfill runs in one transaction under a PostgreSQL advisory lock.
- It inserts only active SIS students whose legacy class belongs to the selected year and who have no `StudentClass` row for that year.
- Existing enrollment rows are never updated or deleted.
- Conflicting class assignments and unrecognized statuses block the write.
- Generated row IDs are deterministic, so a verified rerun is idempotent.

## Stage 1 — Back up and identify the target

1. Create or verify a restorable database backup/snapshot.
2. Record the backup identifier and timestamp in the release ticket.
3. Resolve the school ID:

   ```bash
   SCHOOL_NAME="Svaythom High School" npm run migrate:v1-resolve-school
   ```

4. Do not use a shared production-style school for destructive QA. E2E registration and approval tests belong in the isolated QA school.

## Stage 2 — Read-only preflight

```bash
SCHOOL_ID="<school-id>" npm run db:student-lifecycle:check
```

Use `ACADEMIC_YEAR_ID="<year-id>"` when the school has no current year or has an invalid multiple-current-year configuration.

The result must be `READY`. Before applying, confirm:

- Prisma migration `20260802150000_separate_student_record_lifecycle` is complete.
- `academicYearCensusCount` matches the expected school census.
- `candidateCount` equals `fallbackOnlyCount`.
- `conflictingEnrollmentCount` is zero.
- `unrecognizedEnrollmentStatusCount` is zero.
- `duplicateEffectiveEnrollmentCount` is zero or has been manually reviewed.
- Linked/pending account counts are plausible and are not inferred from `Student.isAccountActive`.

## Stage 3 — Apply the scoped backfill

Only after the backup and preflight evidence are attached to the release ticket:

```bash
ALLOW_PRODUCTION_DB=1 \
ALLOW_STUDENT_LIFECYCLE_BACKFILL=1 \
SCHOOL_ID="<school-id>" \
npm run db:student-lifecycle:apply -- --confirm=BACKFILL_STUDENT_CLASSES
```

For a non-production database, omit `ALLOW_PRODUCTION_DB=1` if the database safety check permits the target.

The command re-runs the report after commit. It fails when either `candidateCount` or `fallbackOnlyCount` remains non-zero.

## Stage 4 — Application verification

1. Configure the same non-empty `NOTIFICATION_SERVICE_AUTH_TOKEN` secret for Auth/Engagement, Academic API and any enabled legacy Grade/Attendance services. Never store the real value in Git.
2. Deploy the Academic API and any enabled legacy academic services.
3. Deploy Web Admin.
4. Clear or version server/browser student-count caches.
5. Confirm Dashboard, Student Directory, Classes, Grade Entry, Reports and exports show the same academic-year census.
6. Confirm students with legacy `isAccountActive=false` remain visible as active SIS records.
7. Confirm account badges are based on actual User/link state:
   - no User and no pending request → `NOT_REGISTERED`
   - pending request → `PENDING`
   - linked active User → `LINKED`
   - linked suspended User → `SUSPENDED`
8. Verify password-reset actions are unavailable when no official Stunity account exists.
9. Reissue the 51 expired student Claim Codes shortly before launch; do not extend or expose expired credentials silently.

## Stage 5 — Remove the compatibility fallback

Do this in a later release, not in the same data rollout:

1. Run the checker for every active school/current year.
2. Require `fallbackOnlyCount = 0` everywhere.
3. Remove the temporary `Student.classId` fallback from directory/dashboard scopes.
4. Run count-agreement, tenant-isolation and school-link E2E suites before deployment.

## Svaythom rollout evidence — 2026-08-02

Read-only preflight produced:

- Active SIS records: 1,727
- Academic-year census: 1,726
- Active SIS records outside the selected academic year: 1 (an unassigned record with no legacy class and no `StudentClass`; correctly excluded from the 2025–2026 census)
- Pre-apply canonical `StudentClass` students: 1,715
- Pre-apply safe backfill candidates / fallback-only students: 11
- Inserted `StudentClass` rows: 11
- Post-apply canonical `StudentClass` students: 1,726
- Post-apply fallback-only students: 0
- Enrollment conflicts: 0
- Unrecognized statuses: 0
- Duplicate effective enrollments: 0
- Linked Stunity student accounts: 0
- Pending student school links: 9
- Claim codes flagged active/unclaimed: 51
- Currently usable unclaimed claim codes: 0 (reissue/refresh before the student launch)

The transaction committed successfully and the post-commit report returned `READY`.

Cloud Run configuration inspection also confirmed that both consolidated `stunity-engagement-api` and `stunity-academic-api` declare `NOTIFICATION_SERVICE_AUTH_TOKEN`. Secret values were not read or printed.

Production rollout completed on 2026-08-02:

- Engagement API revision `stunity-engagement-api-00008-nwf`, 100% traffic, `/health` = HTTP 200
- Academic API revision `stunity-academic-api-00007-49f`, 100% traffic, `/health` = HTTP 200
- Notification bridge without a service token = HTTP 401
- Claim Code administration without a user access token = HTTP 401
- Post-deploy lifecycle check = `READY` (canonical 1,726; fallback/conflicts/duplicates 0)
- Isolated Web Admin production deployment `dpl_8tD8PTrHxMCDEQVVxQETU1ZycLwh` = `READY`, aliased to `stunity.app`
- Dashboard, Students, Academic Years and Claim Codes release files were overlaid on production commit `2bcf3f6d`; uncommitted landing redesign files were deliberately excluded
- Final Web smoke: Students, Academic Years and Claim Codes routes = HTTP 200; security headers preserved; public homepage marker unchanged

Follow-up count-precision release completed on 2026-08-03 (Asia/Phnom_Penh):

- The Student Directory summary contract now keeps the selected academic-year census separate from the school-wide SIS total.
- With 2025–2026 selected, `total`/roster count is 1,726 and `outsideAcademicYear` is 1; the unassigned admission record is no longer added to the selected-year KPI.
- A class filter limits directory rows without changing the year-wide summary or misclassifying students from other classes as outside the academic year.
- Server and browser student-directory cache versions were advanced so old 1,727 summary payloads cannot survive the release.
- Academic API revision `stunity-academic-api-00008-bs8`, 100% traffic, `/health` = HTTP 200.
- Post-deploy production lifecycle check = `READY`: current-year census/canonical 1,726; outside-year 1; fallback/conflicts/duplicates 0.
- Isolated Web Admin deployment `dpl_5JkUmD5kdnZhLamo5YLNcidjLYr5` = `READY`, aliased to `stunity.app`.
- Production routes `/en/students`, `/en/settings/academic-years` and `/en/admin/claim-codes` returned HTTP 200; security headers remained intact.
- The homepage retained the production `Reimagine education` marker and did not contain the unreleased `Your school,` marker.

Claim Code launch audit:

- All 51 active/unclaimed codes are expired (expiry date 2026-07-26), so none is currently usable.
- They belong to 51 distinct current-year students; there are no duplicate flagged codes per student.
- Nine of those students already have pending school-link requests. Do not revoke or replace their credentials while those requests are pending.
- Generate/reissue usable credentials only in a controlled launch operation shortly before official student onboarding, after reviewing pending requests and recording the batch in the release ticket.
