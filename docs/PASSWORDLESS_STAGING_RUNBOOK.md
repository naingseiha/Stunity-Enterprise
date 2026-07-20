# Passwordless staging readiness runbook

This runbook covers the safe staging slice for Passwordless Authentication and
School Linking. It does not select an SMS vendor, create provider credentials,
enable provider buttons, or deploy production.

## 1. Preflight the database

Run the read-only preflight against the staging **direct** PostgreSQL URL:

```sh
DIRECT_URL="<staging-direct-url>" npm run db:passwordless-preflight
```

The command prints JSON with `blockers`, `warnings`, and bounded check names. It
exits non-zero when any of these would make the Phase 1/2 migration unsafe:

- required `users`, `schools`, or `claim_codes` tables are missing;
- legacy `users.linkingStatus` or `users.pendingLinkData` is missing;
- an unfinished Prisma migration exists;
- approved users collide on a student or teacher roster profile;
- a pending legacy link has no matching claim code;
- one claim code is attached to multiple pending users; or
- stored phone values collide after conservative canonicalization.

Resolve blockers and rerun the check. The script never prints phone numbers,
claim codes, user IDs, or school names.

If a legacy user-id admin endpoint returns
`SCHOOL_LINK_NORMALIZATION_REQUIRED`, do not approve or reject by editing
`users.pendingLinkData`. Run the preflight, repair/backfill the normalized
`SchoolLinkRequest`, and then retry through the same compatibility endpoint.

## 2. Apply the migrations

After preflight is clean, use the normal migration pipeline with the staging
secret store loaded:

```sh
npm run db:migrate
```

For a deploy job, use `prisma migrate deploy` with the same schema and direct
URL. Never use `db push` against staging or production. Confirm both migration
directories are applied:

- `20260720180000_passwordless_school_link_phase1`
- `20260720190000_phone_passwordless_phase2`
- `20260720200000_passkey_auth_sessions_phase4`
- `20260720210000_school_memberships_phase5`

The Phase 4 migration stores passkey public keys and hashed refresh-session
metadata only; it does not enable passkey endpoints by itself. The Phase 5
migration backfills active memberships from approved normalized school links and
legacy approved users, while `User.schoolId`, `User.studentId`, `User.teacherId`,
and `User.role` remain compatibility projections until every service has moved
to membership-aware authorization.

If the migration ledger reports a failure, stop and recover that migration
before attempting a later one. Do not mark a failed migration applied merely to
make the deploy continue.

## 3. Configuration gate

Keep all three flags false until the provider and client pilot checklist is
approved:

```dotenv
PASSWORDLESS_AUTH_ENABLED="false"
AUTH_STRUCTURED_METRICS_ENABLED="false"
EXPO_PUBLIC_PASSWORDLESS_AUTH_ENABLED="false"
NEXT_PUBLIC_PASSWORDLESS_AUTH_ENABLED="false"
```

When a staging pilot is explicitly approved, configure a unique
`OTP_HMAC_SECRET`, shared Redis, and the approved Telegram/SMS adapter in the
secret manager. `OTP_LOCAL_TEST_CODE` is for local QA only and must be empty in
staging and production.

Before a pilot, set `AUTH_STRUCTURED_METRICS_ENABLED="true"` in the auth-service
environment and verify `GET /health/ready` reports `observability: true`. The
endpoint exposes configuration modes and readiness only; it never returns
provider credentials, phone numbers, claim codes, or user identifiers.

Structured metric events are emitted as JSON to stdout for the platform logging
pipeline. Create bounded log-based counters/distributions for:

- `auth_otp_started_total`
- `auth_otp_delivered_total`
- `auth_otp_verified_total`
- `auth_otp_failed_total`
- `auth_otp_fallback_total`
- `auth_login_completed_total`
- `auth_login_duration_ms`
- `school_link_submitted_total`
- `school_link_approved_total`
- `school_link_rejected_total`
- `school_link_unlinked_total`
- `school_claim_reissued_total`

Only allowlisted labels are emitted. Unknown provider/error values collapse to
`UNKNOWN` or `OTHER` so destinations and unbounded identifiers cannot become
metric labels.

## 4. Verification and privacy checks

With provider delivery enabled only in the isolated pilot cohort, verify:

1. New phone → OTP → General Account enrollment → Feed.
2. Existing verified phone → the same User, with no duplicate account.
3. Wrong code lockout and resend cooldown.
4. Telegram unavailable → explicit SMS fallback, with no double send.
5. Claim deep link survives authentication and returns to masked confirmation.
6. Admin approval, rejection, cancellation, unlink, and optional reissue.
7. After unlink, the General Account and academic records remain, while school
   access is invalidated.

For the new authenticated school-link flow, the client calls
`POST /auth/claim-codes/preview` after login and receives only masked roster
confirmation fields. `POST /auth/claim-codes/validate` remains available solely
as a rate-limited compatibility adapter for already-released unauthenticated
claim scanners; do not use it for new UI flows.

Inspect `verified_contacts` and `otp_auth_audit_events` using a read-only support
role. Confirm audit metadata contains no OTP value, provider token, refresh
token, plaintext claim code, or full destination.

### Claim deep-link QA

Use a non-production Claim Code in either supported shape:

- `stunity://claim/STNT-XXXX-XXXX`
- `stunity://claim?code=STNT-XXXX-XXXX`
- `https://stunity.app/claim/STNT-XXXX-XXXX`
- `https://stunity.app/claim?code=STNT-XXXX-XXXX`

The client stores only the normalized Claim Code and timestamps in encrypted
device storage, expires it after 15 minutes, and resumes masked confirmation
after authentication or app restart. Confirm that **Cancel and continue without
linking** clears the saved Claim Code and enters the General Account without
submitting a school-link request.

The custom `stunity://` scheme is the staging-safe test path. HTTPS Universal/App
Links require the deployed `apple-app-site-association` and `assetlinks.json`
files to authorize `/claim`; the mobile configuration alone does not activate
the web-domain association.

## 5. Operational response

### Telegram unavailable or balance exhausted

Keep `auth_telegram_gateway` off, return the safe SMS fallback only when an
approved bridge is configured, and watch `FAILED`, `RATE_LIMITED`, and provider
budget audit events. Do not retry both channels automatically for one request.

### SMS outage or cost spike

Disable the SMS flag or set its daily budget to zero in the secret/config store.
Keep password and existing verified methods available. Investigate delivery,
fallback, and budget events before restoring the pilot.

### Suspicious OTP traffic

Disable the passwordless flag, preserve the audit rows, and review aggregate
counts by channel, reason code, IP, subnet bucket, and destination hash. OTP
start limits group IPv4 clients by `/24` and IPv6 clients by `/64`, and persist
only hashed network keys in shared Redis. Never export raw
destinations or OTP content to tickets or dashboards.

### Lost or changed phone

Do not merge accounts from a newly verified number alone. Use an existing
credential, passkey, verified email, or school-assisted recovery. A school
link remains tied to its approved roster profile, not to the phone number.

### Wrong school profile approved

An authorized administrator must use the transactional unlink flow with a reason
and expected identifiers. Confirm the old claim is retired, school-scoped
sessions are invalidated, and a replacement claim is issued only when requested.
If the wrong user was unlinked, follow the same audited flow to submit and
approve the correct account; never edit compatibility fields manually.

## 6. Rollback

For a feature rollback, set all three flags back to `false`. Do not reverse the
schema migration destructively: verified contacts and audit history are safe to
retain, and password login remains available. A schema rollback requires a
reviewed, forward migration and a database backup/restore plan.
