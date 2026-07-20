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

## "Continue with Telegram" (Phase 3 OIDC)

This is a separate feature flag (`AUTH_TELEGRAM_OIDC_ENABLED`) from Phase 2
phone OTP, and a separate credential from the Telegram Gateway token above —
Gateway sends a one-time code inside Telegram, OIDC is a full Authorization
Code + PKCE sign-in redirect. Both can be enabled independently.

Every endpoint is env-configured rather than hard-coded
(`services/auth-service/src/oidc/telegramOidc.ts`), so this only starts
serving traffic once all seven `TELEGRAM_OIDC_*` values are set together:

| Variable | Purpose |
| --- | --- |
| `TELEGRAM_OIDC_CLIENT_ID` / `TELEGRAM_OIDC_CLIENT_SECRET` | Credentials issued for the Stunity client |
| `TELEGRAM_OIDC_REDIRECT_URI` | Must exactly match the auth service's `/auth/oidc/telegram/callback` URL registered with the provider |
| `TELEGRAM_OIDC_ISSUER` | Expected `iss` claim on the id_token |
| `TELEGRAM_OIDC_AUTHORIZATION_ENDPOINT` / `TELEGRAM_OIDC_TOKEN_ENDPOINT` / `TELEGRAM_OIDC_JWKS_URI` | Provider endpoints |
| `TELEGRAM_OIDC_SCOPE` | Defaults to `openid` |

The auth service validates the id_token signature against `TELEGRAM_OIDC_JWKS_URI`
and checks issuer, audience, nonce, and timestamps
(`services/auth-service/src/security/oidcSecurity.ts`) before resolving or
creating an account through the same safe-linking path used by
Google/Apple/Facebook/LinkedIn (`handleSocialLogin` in
`services/auth-service/src/routes/socialAuth.routes.ts`) — a Telegram identity
can never silently attach to an existing account with a matching but
unverified email.

Set `WEB_APP_URL` to the web app's public origin: the callback redirects the
browser to `${WEB_APP_URL}/auth/oidc/complete` with a one-time exchange code
(never a raw token) after it resolves the account server-side. Set
`NEXT_PUBLIC_AUTH_TELEGRAM_OIDC_ENABLED="true"` only in the web build
environment once the backend flag is confirmed working, to show the
**Continue with Telegram** button.

### Getting real production credentials

Telegram's OIDC service is real and live — verified directly (not assumed)
against its own discovery document:

```sh
curl --compressed https://oauth.telegram.org/.well-known/openid-configuration
```

Setup, per Telegram's own docs (<https://core.telegram.org/widgets/login>):

1. Create/use a Telegram bot to represent the app, via **@BotFather**.
2. In @BotFather → **Bot Settings → Web Login** → register the production
   Allowed URL(s) — must exactly match `TELEGRAM_OIDC_REDIRECT_URI` below.
3. BotFather issues a **Client ID** and **Client Secret**.

Production values:

```dotenv
AUTH_TELEGRAM_OIDC_ENABLED=true
TELEGRAM_OIDC_CLIENT_ID=<from BotFather>
TELEGRAM_OIDC_CLIENT_SECRET=<from BotFather>
TELEGRAM_OIDC_REDIRECT_URI=https://<your-auth-service-domain>/auth/oidc/telegram/callback
TELEGRAM_OIDC_ISSUER=https://oauth.telegram.org
TELEGRAM_OIDC_AUTHORIZATION_ENDPOINT=https://oauth.telegram.org/auth
TELEGRAM_OIDC_TOKEN_ENDPOINT=https://oauth.telegram.org/token
TELEGRAM_OIDC_JWKS_URI=https://oauth.telegram.org/.well-known/jwks.json
```

No code changes are needed to go from a local mock provider to this — that's
the point of every endpoint being env-configured
(`services/auth-service/src/oidc/telegramOidc.ts`).

One real behavioral difference from Google/Apple/Facebook/LinkedIn: Telegram's
discovery document lists `claims_supported` as `aud, preferred_username,
phone_number, exp, iat, iss, name, picture, sub` — **there is no `email`
claim**, and `name` is not guaranteed either. The callback
(`services/auth-service/src/routes/oidcTelegram.routes.ts`) falls back to
`preferred_username` for the display name and always leaves `email` empty
rather than guessing — an empty email is also what keeps this the "brand new
user" path in `handleSocialLogin` instead of risking a match against an
unrelated existing account. `phone_number` is captured into
`SocialAccount.rawProfile` for reference but is deliberately **not** wired
into `User.phone`/`VerifiedContact` — doing that safely needs the same E.164
normalization and duplicate-resolution path phone OTP already goes through
(`services/auth-service/src/security/identifiers.ts`), which a federated
login claim shouldn't bypass.

### Local QA without real Telegram credentials

`services/auth-service/scripts/mock-telegram-oidc-server.mjs` is a small
local-only OIDC provider (`GET /authorize`, `POST /token`, `GET /jwks`) that
auto-approves every request as a fixed test identity — no real Telegram
account, bot, or BotFather setup needed to exercise the full redirect / PKCE
/ callback / session-exchange code path end to end.

```sh
npm --prefix services/auth-service run mock:telegram-oidc
```

Then point the `TELEGRAM_OIDC_*` variables above at it instead of
`oauth.telegram.org` (e.g. `http://localhost:4500/authorize`). Its issuer is
derived from whichever host/port you reach it on, so the same running
instance works for both a web test (`localhost`) and a mobile
simulator/device test (the machine's LAN IP) — just make sure
`TELEGRAM_OIDC_REDIRECT_URI` and `TELEGRAM_OIDC_ISSUER` use a host reachable
by whichever client is testing (a phone cannot reach your machine's
`localhost`; use the LAN IP from `ifconfig` instead, and expect it to drift
across networks).

### Mobile (Expo)

The app calls `GET /auth/oidc/telegram/start?client=mobile`; the callback then
redirects to `MOBILE_APP_OIDC_REDIRECT_URI` (default
`stunity://auth/oidc/complete`, matching `apps/mobile/app.json`'s `scheme`)
instead of the web origin, still carrying only the one-time exchange code.
`apps/mobile/src/stores/authStore.ts`'s `startTelegramOidc()` opens that URL
with `expo-web-browser`'s `openAuthSessionAsync`, catches the deep-link
return, and posts the code to the same `POST /auth/oidc/telegram/session`
endpoint the web client uses — there is no separate native token-exchange
endpoint; the browser-redirect flow is reused as-is. Set
`EXPO_PUBLIC_AUTH_TELEGRAM_OIDC_ENABLED="true"` in the mobile build
environment to show the button.

## Passkeys / WebAuthn (Phase 4)

A separate flag, `AUTH_PASSKEYS_ENABLED`, gates six routes implemented with
the maintained `@simplewebauthn/server` library
(`services/auth-service/src/routes/passkey.routes.ts`):
`POST /auth/passkeys/register/options`, `POST /auth/passkeys/register/verify`,
`POST /auth/passkeys/authenticate/options`,
`POST /auth/passkeys/authenticate/verify`, `GET /auth/me/passkeys`, and
`DELETE /auth/me/passkeys/:credentialId`.

Required config, all three together:

| Variable | Purpose |
| --- | --- |
| `WEBAUTHN_RP_ID` | The Relying Party ID — the app's bare domain (no scheme/port), e.g. `stunity.example` |
| `WEBAUTHN_RP_NAME` | User-visible service name shown in the OS passkey prompt |
| `WEBAUTHN_ORIGIN` | Comma-separated exact `https://` origin(s) allowed to complete a ceremony |

Sign-in uses **discoverable (usernameless) credentials**: registration asks
for `residentKey: "required"`, and authentication sends no `allowCredentials`
list, so the browser's own passkey picker resolves the user via the
credential's `userHandle` — the client never needs to type an identifier
first, matching the passwordless product direction.

Registration and authentication are separate ceremonies:

- Registration (`/register/options`, `/register/verify`) requires an existing
  session — a user must already be signed in (phone OTP, Telegram OIDC, or
  password) before enrolling a passkey, offered as **"Use fingerprint or face
  next time"** right after that sign-in completes
  (`apps/web/src/components/auth/PasswordlessAuthCard.tsx`'s `PASSKEY_OFFER`
  step). Skipping it is always available and never blocks reaching the app.
- Authentication (`/authenticate/options`, `/authenticate/verify`) is public
  and issues a normal session directly — it's the **"Use fingerprint or
  face"** button offered alongside phone entry on login.

Two safety checks live in the routes, not just the client:

- **Counter-reuse detection**: most platform authenticators (Face ID/Touch
  ID/Windows Hello) always report a `0` counter, which is normal — but if a
  *previously nonzero* counter fails to advance, the credential is treated as
  cloned and immediately revoked (`PASSKEY_REUSE_DETECTED`).
- **Last-method protection**: `DELETE /auth/me/passkeys/:credentialId` uses
  `services/auth-service/src/security/identityPolicy.ts`'s
  `canRemoveIdentity()` — the same policy module already covered by tests —
  to refuse removing a user's only usable sign-in method
  (`LAST_METHOD_REQUIRED`), and requires a token issued within the last 5
  minutes (`STEP_UP_REQUIRED` otherwise, prompting a fresh sign-in first).

Set `NEXT_PUBLIC_AUTH_PASSKEYS_ENABLED="true"` in the web build environment
once the backend flag and RP config are confirmed working.

**Mobile native passkeys are not implemented in this change.** Expo/React
Native has no built-in WebAuthn API; supporting it natively needs a
Credential Manager (Android) / `ASAuthorizationController` (iOS) bridge (e.g.
`react-native-passkeys`), which is a materially larger integration than the
web browser flow above and is left for a follow-up.

## Safe rollback

Set `PASSWORDLESS_AUTH_ENABLED`,
`EXPO_PUBLIC_PASSWORDLESS_AUTH_ENABLED`, and
`NEXT_PUBLIC_PASSWORDLESS_AUTH_ENABLED` back to `false`. Existing password
users and school-linked accounts remain available; disabling the feature does
not delete verified contacts or academic records.

Independently, set `AUTH_TELEGRAM_OIDC_ENABLED` and
`NEXT_PUBLIC_AUTH_TELEGRAM_OIDC_ENABLED` back to `false` to roll back
"Continue with Telegram" without affecting phone OTP.

Independently again, set `AUTH_PASSKEYS_ENABLED` and
`NEXT_PUBLIC_AUTH_PASSKEYS_ENABLED` back to `false` to roll back passkeys.
Existing `PasskeyCredential` rows are preserved (not deleted), so re-enabling
later does not require users to re-register.
