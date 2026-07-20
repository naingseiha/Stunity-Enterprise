# Passwordless provider setup (Telegram/SMS)

This runbook is for the Phase 2 passwordless foundation. It does not enable a
provider, apply a migration, or deploy production. Keep the feature disabled
until the staging checklist below is complete.

## Do I need to fill `.env` now?

No. If `PASSWORDLESS_AUTH_ENABLED="false"` (the current default), the existing
password login and registration flows continue to work and provider credentials
are not needed.

Only create real values in a local/staging secret store when we are ready to
test passwordless delivery. Never commit a real `.env`, token, API key, or OTP
secret. The repository `.env.example` contains placeholders only.

The auth service now validates this configuration at startup. In production,
enabling Passwordless without a 32+ character `OTP_HMAC_SECRET`, shared Redis,
and at least one Telegram/SMS provider fails fast instead of accepting requests
that cannot be delivered safely.

## Required values by environment

| Variable | Local password flow | Local passwordless QA | Staging/production |
| --- | --- | --- | --- |
| `PASSWORDLESS_AUTH_ENABLED` | `false` | `true` | `true` only after pilot approval |
| `AUTH_STRUCTURED_METRICS_ENABLED` | `false` | optional | `true` before pilot activation |
| `OTP_HMAC_SECRET` | placeholder is fine | random 32+ character secret | random 32+ character secret in a secret manager |
| `REDIS_URL` | existing local Redis | shared Redis reachable by auth service | managed/shared Redis (required for multi-instance safety) |
| `OTP_LOCAL_TEST_CODE` | empty | six digits, non-production only | always empty |
| `OTP_DAILY_TELEGRAM_LIMIT` | empty | optional | required when Telegram is enabled |
| `OTP_DAILY_SMS_LIMIT` | empty | optional | required when SMS is enabled |
| Telegram variables | empty | use a real Telegram Gateway token for delivery, or use the local test code | real Telegram Gateway token if Telegram is enabled |
| SMS bridge variables | empty | only if an SMS bridge is already operated | only if an approved SMS bridge is operated |

Generate the HMAC secret locally with:

```sh
openssl rand -hex 32
```

Put the output in the auth service secret store as `OTP_HMAC_SECRET`. Do not
use a human password and do not reuse `JWT_SECRET`.

The daily provider limits are message-count safety ceilings. Choose them from
the approved pilot budget (for example, a small SMS ceiling and a larger
Telegram ceiling); the service counts sends in shared Redis and returns a safe
rate-limit response after the ceiling is reached.

## Telegram Gateway (direct adapter)

The auth service already supports Telegram Gateway directly. To obtain the
credential:

1. Sign in to Telegram and open **Gateway → API / Settings**.
2. Create or copy the Gateway **Access Token**.
3. Fund the Gateway account before a real delivery test. Telegram documents
   that `checkSendAbility` returns a `request_id`; the service reuses that id
   for `sendVerificationMessage` so the ability check is not charged twice.
4. Store the token as `TELEGRAM_GATEWAY_ACCESS_TOKEN` in the secret manager.

The direct adapter sends an E.164 phone number and a numeric code with a bounded
TTL, then checks the Telegram verification status before accepting the login.
See Telegram's official [Gateway API](https://core.telegram.org/gateway/api) and
[verification tutorial](https://core.telegram.org/gateway/verification-tutorial)
for account setup and testing.

Optional values:

- `TELEGRAM_GATEWAY_SENDER_USERNAME`: leave empty unless a verified sender
  username owned by the same Gateway account is required.
- `TELEGRAM_GATEWAY_CALLBACK_URL`: leave empty for now. Callback delivery is
  not enabled until callback authenticity verification is implemented and
  tested; setting a URL prematurely does not improve security.

## SMS fallback

SMS is intentionally an adapter boundary. Set these only when an approved
internal bridge has been provisioned:

```dotenv
OTP_SMS_PROVIDER_URL="https://<approved-bridge>/v1/otp"
OTP_PROVIDER_BRIDGE_TOKEN="<bridge-token>"
```

The bridge must implement the contract documented in
`services/auth-service/src/passwordless/verificationProvider.ts`:

- `POST /can-send` → `{ "available": true|false, "reasonCode"?: string }`
- `POST /send` → `{ "receiptId": "..." }`

The bridge owns the vendor SDK credentials. Do not put a vendor account secret
in the mobile app or browser. The auth service still owns OTP generation,
hashing, expiry, device binding, and rate limits.

Twilio Verify is a possible first SMS pilot, but a direct Twilio adapter is not
enabled in this change. If Twilio is selected, provision the Verify Service and
credentials from the Twilio Console, then implement/review the bridge before
adding its URL. Twilio's official [Verification API](https://www.twilio.com/docs/verify/api/verification)
describes the Verify Service and E.164 request format; protect the Account SID
and Auth Token as secrets ([credential guidance](https://help.twilio.com/articles/223136027)).

## Staging checklist before enabling the flag

1. Run `DIRECT_URL="<staging-direct-url>" npm run db:passwordless-preflight`
   and resolve every blocker. See `docs/PASSWORDLESS_STAGING_RUNBOOK.md`.
2. Apply the Phase 2 Prisma migration in the staging database using the normal
   migration pipeline (never `db push` against a shared/prod database).
3. Configure a shared Redis URL and a unique `OTP_HMAC_SECRET`.
4. Configure Telegram Gateway and/or the approved SMS bridge. For broad rollout,
   keep an SMS fallback available when Telegram cannot deliver.
5. Set `EXPO_PUBLIC_PASSWORDLESS_AUTH_ENABLED` and
   `NEXT_PUBLIC_PASSWORDLESS_AUTH_ENABLED` only in the corresponding staging
   build environments.
6. Test: new phone → OTP → General Account enrollment; existing verified phone
   → sign-in; wrong-code lockout; resend cooldown; Telegram unavailable → SMS;
   and no OTP/code/token appears in logs.
7. Monitor delivery failures, rate-limit events, and `OtpAuthAuditEvent` records
   before expanding the pilot.

## Safe rollback

Set `PASSWORDLESS_AUTH_ENABLED`,
`EXPO_PUBLIC_PASSWORDLESS_AUTH_ENABLED`, and
`NEXT_PUBLIC_PASSWORDLESS_AUTH_ENABLED` back to `false`. Existing password
users and school-linked accounts remain available; disabling the feature does
not delete verified contacts or academic records.
