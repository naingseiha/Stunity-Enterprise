# Student Claim Code Launch Runbook

**Last verified:** 3 August 2026
**Purpose:** create a controlled first-login credential batch for students who have an active SIS record but do not yet have an official Stunity Social account.

## Identity rule

An SIS student record is not an app account. `Student.recordStatus` controls the school record lifecycle. A linked `User.studentId`, an accepted school link, or an active membership represents account access. Imported legacy `isActive` values must not be used to decide whether a student exists in the current-year census or whether the student has registered for Social Media.

The launch workflow only considers active, canonical current-year enrollments. It protects students who already have a linked account or a pending school-link request.

## Mandatory preflight

Dry run is the default and does not generate or expose credentials:

```bash
SCHOOL_ID=<school-id> npm run db:claim-code-launch:check
```

To select a non-current year or produce machine-readable output:

```bash
SCHOOL_ID=<school-id> npm run db:claim-code-launch:check -- \
  --academic-year-id=<academic-year-id> \
  --json
```

The report is ready only when:

- the school and exactly one academic year resolve;
- the selected year has active canonical students;
- no student has multiple active, unclaimed Claim Codes;
- linked accounts and pending links are excluded from credential creation;
- the expected create/rotate/keep counts have been reviewed by an authorized school administrator.

## Verified Svaythom preflight

The production preflight on 3 August 2026 returned `READY`:

| Check | Count |
|---|---:|
| Current-year canonical students | 1,726 |
| Official linked accounts | 0 |
| Protected pending school links | 9 |
| Eligible students | 1,717 |
| Existing usable codes retained | 0 |
| Expired codes to rotate | 42 |
| Missing codes to create | 1,675 |
| Duplicate active-code students | 0 |
| Planned credentials | 1,717 |

The nine pending links are intentionally protected. This runbook and preflight were implemented, but **the apply command has not been run** and no student credentials were generated.

## Approved apply procedure

Use a private absolute output path on an encrypted operator-controlled device. The file must not already exist. The workflow creates it with mode `0600` and refuses to overwrite any file.

```bash
ALLOW_PRODUCTION_DB=1 \
ALLOW_CLAIM_CODE_LAUNCH=1 \
SCHOOL_ID=<school-id> \
npm run db:claim-code-launch:apply -- \
  --academic-year-id=<academic-year-id> \
  --expires-in-days=30 \
  --output=/absolute/private/path/student-claim-codes.csv \
  --confirm=GENERATE_STUDENT_LAUNCH_CODES
```

Required human approvals before apply:

1. School owner confirms the launch date, academic year and current enrollment count.
2. Support team resolves or explicitly accepts every pending school-link request.
3. Security owner approves the credential lifetime and delivery channel.
4. Operator confirms that the CSV path is outside source control, shared drives and automatic cloud sync.

## Transaction and data protections

- Runs in one serializable database transaction with a PostgreSQL advisory lock.
- Re-runs the complete preflight inside the locked transaction.
- Never replaces usable credentials.
- Revokes only expired, active, unclaimed credentials selected for replacement.
- Generates collision-checked `STNT-XXXX-XXXX` codes.
- Rolls back database changes and removes the incomplete output file on failure.
- Emits codes only to the approved CSV; JSON and dry-run reports never contain credential values.

## Distribution and post-launch controls

- Split printing/distribution by class and keep a custody record.
- Never send the complete CSV through email, chat or a public link.
- Require identity verification during claim using the stored student verification data.
- Revoke lost or exposed codes immediately from the Admin Claim Codes page.
- After the launch window, verify claimed, remaining, expired, revoked and pending-link totals.
- Securely delete the CSV after the agreed retention period and record who confirmed deletion.

## Validation commands

```bash
npm run test:claim-code-launch
npm run db:claim-code-launch:check -- --help
```

The launch library currently has five passing unit tests covering argument validation, apply gates, readiness blockers, planned counts and CSV escaping.
