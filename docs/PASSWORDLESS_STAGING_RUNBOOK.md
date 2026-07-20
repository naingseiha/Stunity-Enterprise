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

If the migration ledger reports a failure, stop and recover that migration
before attempting a later one. Do not mark a failed migration applied merely to
make the deploy continue.

## 3. Configuration gate

Keep all three flags false until the provider and client pilot checklist is
approved:

```dotenv
PASSWORDLESS_AUTH_ENABLED="false"
EXPO_PUBLIC_PASSWORDLESS_AUTH_ENABLED="false"
NEXT_PUBLIC_PASSWORDLESS_AUTH_ENABLED="false"
```

When a staging pilot is explicitly approved, configure a unique
`OTP_HMAC_SECRET`, shared Redis, and the approved Telegram/SMS adapter in the
secret manager. `OTP_LOCAL_TEST_CODE` is for local QA only and must be empty in
staging and production.

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

Inspect `verified_contacts` and `otp_auth_audit_events` using a read-only support
role. Confirm audit metadata contains no OTP value, provider token, refresh
token, plaintext claim code, or full destination.

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
counts by channel, reason code, IP, and destination hash. Never export raw
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
