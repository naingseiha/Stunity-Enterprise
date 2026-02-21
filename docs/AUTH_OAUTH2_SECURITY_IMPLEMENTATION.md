# 🔐 Stunity Enterprise — OAuth2 Social Login & Security Hardening

**Version:** 1.0 | **Created:** February 20, 2026  
**Status:** Implementation Guide  
**Scope:** OAuth2 (Google, Apple, Facebook, LinkedIn) + 2FA/MFA + Password Reset + Rate Limiting + Security Headers

> This document is the authoritative implementation guide for adding social login and enterprise-grade security to Stunity's custom auth-service. Every section includes exact files, endpoints, database changes, and code patterns.

---

## 📋 Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Changes](#2-database-changes)
3. [OAuth2 Social Login](#3-oauth2-social-login)
   - [Google](#3a-google)
   - [Apple](#3b-apple)
   - [Facebook](#3c-facebook)
   - [LinkedIn](#3d-linkedin)
4. [Account Linking & Conflict Resolution](#4-account-linking--conflict-resolution)
5. [Password Reset Flow](#5-password-reset-flow)
6. [Two-Factor Authentication (2FA/MFA)](#6-two-factor-authentication-2famfa)
7. [Rate Limiting](#7-rate-limiting)
8. [Security Headers & Hardening](#8-security-headers--hardening)
9. [Brute Force & Account Lockout](#9-brute-force--account-lockout)
10. [Password Policy](#10-password-policy)
11. [Session Security](#11-session-security)
12. [Mobile Implementation](#12-mobile-implementation)
13. [Web Implementation](#13-web-implementation)
14. [Environment Variables](#14-environment-variables)
15. [Testing Checklist](#15-testing-checklist)
16. [Implementation Order](#16-implementation-order)

---

## 1. Architecture Overview

### Identity Broker Pattern (Industry Standard)

Your auth-service remains the **single identity broker**. Social providers are just identity verification methods — your backend always issues its own JWT.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Mobile / Web)                        │
│                                                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Email/  │  │  Google  │  │  Apple   │  │ Facebook │  │LinkedIn │ │
│  │ Password │  │  Login   │  │  Login   │  │  Login   │  │  Login  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │              │              │              │              │     │
│       └──────────────┴──────────────┴──────────────┴──────────────┘     │
│                                     │                                   │
│                          Provider Token / Credentials                   │
└─────────────────────────────────────┼───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     AUTH SERVICE (port 3001)                            │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Identity Broker Logic                        │   │
│  │                                                                 │   │
│  │  1. Verify provider token (Google API / Apple / FB / LinkedIn) │   │
│  │  2. Find or create User (link by email)                        │   │
│  │  3. Check school subscription + isActive                       │   │
│  │  4. Check 2FA requirement → challenge if enabled               │   │
│  │  5. Issue Stunity JWT (same format for ALL login methods)      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  Middleware: Rate Limiter → Helmet → CORS → Auth → Routes             │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │   PostgreSQL         │
                          │   (Supabase)         │
                          │                     │
                          │   User              │
                          │   SocialAccount     │
                          │   TwoFactorSecret   │
                          │   PasswordResetToken│
                          │   LoginAttempt      │
                          └─────────────────────┘
```

### Key Principle: One JWT, Many Login Methods

Every login method produces the **exact same JWT payload**:

```json
{
  "userId": "clxyz...",
  "email": "user@example.com",
  "role": "STUDENT",
  "schoolId": "clxyz...",
  "school": { "id": "...", "name": "...", "isActive": true }
}
```

No microservice, middleware, or mobile store changes needed. Only `auth-service` is modified.

---

## 2. Database Changes

### New Models — Add to `packages/database/prisma/schema.prisma`

```prisma
// ─── Social Account (OAuth2 Provider Link) ──────────────────────────

model SocialAccount {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider       SocialProvider
  providerUserId String               // Google/Apple/FB/LinkedIn user ID
  email          String?              // Email from provider (may differ from User.email)
  displayName    String?
  avatarUrl      String?
  accessToken    String?              // Provider access token (encrypted at rest)
  refreshToken   String?              // Provider refresh token (encrypted at rest)
  tokenExpiresAt DateTime?
  rawProfile     Json?                // Full provider profile for debugging
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([provider, providerUserId]) // One provider account = one link
  @@unique([provider, userId])         // One provider per user (no duplicate links)
  @@index([userId])
  @@map("social_accounts")
}

enum SocialProvider {
  GOOGLE
  APPLE
  FACEBOOK
  LINKEDIN
}

// ─── Two-Factor Authentication ──────────────────────────────────────

model TwoFactorSecret {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  secret      String                  // TOTP secret (encrypted at rest)
  isEnabled   Boolean  @default(false)
  backupCodes String[]               // Hashed backup codes (one-time use)
  verifiedAt  DateTime?              // When user first verified setup
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("two_factor_secrets")
}

// ─── Login Attempt Tracking (Brute Force Protection) ────────────────

model LoginAttempt {
  id        String   @id @default(cuid())
  email     String?
  phone     String?
  ipAddress String
  userAgent String?
  success   Boolean
  reason    String?               // "invalid_password", "account_locked", "2fa_failed"
  createdAt DateTime @default(now())

  @@index([email, createdAt])
  @@index([ipAddress, createdAt])
  @@map("login_attempts")
}
```

### Update User Model — Add Relations

```prisma
model User {
  // ... existing fields ...

  // Add these relations:
  socialAccounts  SocialAccount[]
  twoFactorSecret TwoFactorSecret?

  // Existing fields already in schema (confirm they exist):
  // failedAttempts      Int       @default(0)
  // lockedUntil         DateTime?
  // passwordResetToken  String?   @unique
  // passwordResetExpiry DateTime?
  // passwordChangedAt   DateTime?
  // isEmailVerified     Boolean   @default(false)
  // emailVerificationToken String? @unique
  // emailVerificationExpiry DateTime?
}
```

### Migration Command

```bash
cd packages/database
npx prisma migrate dev --name add_oauth2_security_models
npx prisma generate
```

---

## 3. OAuth2 Social Login

### New File: `services/auth-service/src/routes/socialAuth.routes.ts`

All four providers follow the same pattern:

```
Client gets provider token → POST /auth/social/{provider} → Verify → Find/Create → Issue JWT
```

---

### 3a. Google

**Package:** `google-auth-library`  
**Install:** `cd services/auth-service && npm install google-auth-library`

**Endpoint:** `POST /auth/social/google`

**Request Body:**
```json
{
  "idToken": "eyJhbGciOi...",       // From Google Sign-In SDK
  "claimCode": "STNT-XXXX-XXXX"     // Optional — link to school during signup
}
```

**Backend Flow:**
```typescript
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(idToken: string) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email_verified) {
    throw new Error('Google email not verified');
  }
  return {
    providerUserId: payload.sub,
    email: payload.email!,
    displayName: payload.name || '',
    avatarUrl: payload.picture || '',
    rawProfile: payload,
  };
}
```

**Google Cloud Console Setup:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Add authorized origins: your app domains
4. Add authorized redirect URIs (for web)
5. Download client config → set `GOOGLE_CLIENT_ID` in `.env`

---

### 3b. Apple

**Package:** `apple-signin-auth`  
**Install:** `cd services/auth-service && npm install apple-signin-auth`

**Endpoint:** `POST /auth/social/apple`

**Request Body:**
```json
{
  "identityToken": "eyJhbGciOi...",  // From Apple Sign In SDK
  "authorizationCode": "c1234...",
  "fullName": {                       // Only sent on FIRST sign-in
    "givenName": "John",
    "familyName": "Doe"
  },
  "claimCode": "STNT-XXXX-XXXX"
}
```

**Backend Flow:**
```typescript
import appleSignin from 'apple-signin-auth';

async function verifyAppleToken(identityToken: string) {
  const payload = await appleSignin.verifyIdToken(identityToken, {
    audience: process.env.APPLE_CLIENT_ID,       // Bundle ID
    ignoreExpiration: false,
  });
  return {
    providerUserId: payload.sub,
    email: payload.email || '',                   // May be relay email
    displayName: '',                              // Apple only sends name on first login
    avatarUrl: '',
    rawProfile: payload,
  };
}
```

**Apple Developer Setup:**
1. Enable "Sign In with Apple" in App ID capabilities
2. Create a Services ID (for web) at https://developer.apple.com
3. Generate a key for Sign In with Apple
4. Set `APPLE_CLIENT_ID` (Bundle ID for mobile, Services ID for web)

**⚠️ Apple-Specific Caveats:**
- Apple only sends the user's name on the **very first** sign-in. Store it immediately.
- Apple may provide a **relay email** (`xxx@privaterelay.appleid.com`). Treat it as a real email.
- If the user's name is missing in the token, use `fullName` from the request body (mobile SDKs send it separately).

---

### 3c. Facebook

**Package:** None needed — use `fetch` to call Facebook Graph API  
**Endpoint:** `POST /auth/social/facebook`

**Request Body:**
```json
{
  "accessToken": "EAAGm0PX4ZCps...",  // From Facebook Login SDK
  "claimCode": "STNT-XXXX-XXXX"
}
```

**Backend Flow:**
```typescript
async function verifyFacebookToken(accessToken: string) {
  // Step 1: Verify token is valid and belongs to your app
  const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;
  const debugRes = await fetch(debugUrl).then(r => r.json());

  if (!debugRes.data?.is_valid || debugRes.data.app_id !== process.env.FACEBOOK_APP_ID) {
    throw new Error('Invalid Facebook token');
  }

  // Step 2: Get user profile
  const profileUrl = `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`;
  const profile = await fetch(profileUrl).then(r => r.json());

  if (!profile.email) {
    throw new Error('Facebook email permission required');
  }

  return {
    providerUserId: profile.id,
    email: profile.email,
    displayName: profile.name || '',
    avatarUrl: profile.picture?.data?.url || '',
    rawProfile: profile,
  };
}
```

**Facebook Developer Setup:**
1. Go to https://developers.facebook.com → Create App
2. Add "Facebook Login" product
3. Set valid OAuth redirect URIs
4. Request permissions: `email`, `public_profile`
5. Set `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` in `.env`

---

### 3d. LinkedIn

**Package:** None needed — use `fetch` to call LinkedIn API  
**Endpoint:** `POST /auth/social/linkedin`

**Request Body:**
```json
{
  "authorizationCode": "AQR2Yv...",   // From LinkedIn OAuth redirect
  "redirectUri": "https://your-app.com/auth/linkedin/callback",
  "claimCode": "STNT-XXXX-XXXX"
}
```

**Backend Flow:**
```typescript
async function verifyLinkedInCode(authorizationCode: string, redirectUri: string) {
  // Step 1: Exchange authorization code for access token
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: authorizationCode,
      redirect_uri: redirectUri,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  }).then(r => r.json());

  if (!tokenRes.access_token) throw new Error('LinkedIn token exchange failed');

  // Step 2: Get user profile via OpenID Connect userinfo
  const profile = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenRes.access_token}` },
  }).then(r => r.json());

  return {
    providerUserId: profile.sub,
    email: profile.email,
    displayName: profile.name || '',
    avatarUrl: profile.picture || '',
    accessToken: tokenRes.access_token,
    rawProfile: profile,
  };
}
```

**LinkedIn Developer Setup:**
1. Go to https://www.linkedin.com/developers → Create App
2. Request products: "Sign In with LinkedIn using OpenID Connect"
3. Add authorized redirect URLs
4. Set `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` in `.env`

---

### Unified Social Login Handler

All four providers converge into one function:

```typescript
// services/auth-service/src/routes/socialAuth.routes.ts

async function handleSocialLogin(
  providerData: {
    provider: SocialProvider;
    providerUserId: string;
    email: string;
    displayName: string;
    avatarUrl: string;
    rawProfile: any;
  },
  claimCode?: string
) {
  // 1. Check if social account already linked
  let socialAccount = await prisma.socialAccount.findUnique({
    where: {
      provider_providerUserId: {
        provider: providerData.provider,
        providerUserId: providerData.providerUserId,
      },
    },
    include: { user: { include: { school: true } } },
  });

  let user;

  if (socialAccount) {
    // ── Returning user (social account already linked) ──
    user = socialAccount.user;
  } else {
    // ── New social login — check if email already exists ──
    user = await prisma.user.findUnique({
      where: { email: providerData.email },
      include: { school: true },
    });

    if (user) {
      // ── Email exists — link social account to existing user ──
      await prisma.socialAccount.create({
        data: {
          userId: user.id,
          provider: providerData.provider,
          providerUserId: providerData.providerUserId,
          email: providerData.email,
          displayName: providerData.displayName,
          avatarUrl: providerData.avatarUrl,
          rawProfile: providerData.rawProfile,
        },
      });
    } else {
      // ── Brand new user — create account ──
      const nameParts = providerData.displayName.split(' ');
      user = await prisma.user.create({
        data: {
          email: providerData.email,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          password: '',                        // No password for social-only accounts
          role: 'STUDENT',                     // Default role; claim code can override
          accountType: 'SOCIAL_ONLY',
          isEmailVerified: true,               // Provider already verified email
          profilePictureUrl: providerData.avatarUrl,
          socialAccounts: {
            create: {
              provider: providerData.provider,
              providerUserId: providerData.providerUserId,
              email: providerData.email,
              displayName: providerData.displayName,
              avatarUrl: providerData.avatarUrl,
              rawProfile: providerData.rawProfile,
            },
          },
        },
        include: { school: true },
      });
    }
  }

  // 2. Validate user is active
  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  // 3. Process claim code if provided (link to school)
  if (claimCode && !user.schoolId) {
    // Same claim code validation logic as existing /auth/claim-codes/link
    // ... validate code, assign schoolId and role
  }

  // 4. Check if 2FA is enabled → return challenge instead of JWT
  const twoFactor = await prisma.twoFactorSecret.findUnique({
    where: { userId: user.id },
  });

  if (twoFactor?.isEnabled) {
    // Return a short-lived 2FA challenge token (not a full JWT)
    const challengeToken = jwt.sign(
      { userId: user.id, purpose: '2fa_challenge' },
      JWT_SECRET,
      { expiresIn: '5m' }
    );
    return {
      requires2FA: true,
      challengeToken,
    };
  }

  // 5. Issue standard Stunity JWT (same as email/password login)
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      school: user.school ? {
        id: user.school.id,
        name: user.school.name,
        isActive: user.school.isActive,
      } : null,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRATION }
  );

  // 6. Update login metadata
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLogin: new Date(),
      loginCount: { increment: 1 },
    },
  });

  return {
    requires2FA: false,
    user,
    tokens: { accessToken, refreshToken },
  };
}
```

---

## 4. Account Linking & Conflict Resolution

### Scenarios

| Scenario | Action |
|----------|--------|
| New social login, email not in DB | Create new User + SocialAccount |
| Social login, email matches existing User | Link SocialAccount to existing User |
| Social login, account already linked | Login directly (returning user) |
| User has email/password + adds Google later | Link via settings page (authenticated) |
| Two providers with same email | Both link to same User (one User, multiple SocialAccounts) |
| Social-only user wants to add password | Allow via "Set Password" in settings (not "Reset") |

### Authenticated Account Linking Endpoint

For users who want to link additional providers from their settings/profile:

```
POST /auth/social/link
Headers: Authorization: Bearer <jwt>
Body: { "provider": "google", "idToken": "..." }
```

```typescript
// Verify the user is authenticated, then:
// 1. Verify provider token
// 2. Check providerUserId not already linked to ANOTHER user
// 3. Create SocialAccount linked to req.user.id
```

### Unlink Provider Endpoint

```
DELETE /auth/social/unlink/:provider
Headers: Authorization: Bearer <jwt>
```

```typescript
// 1. Check user has at least one other login method (password or another provider)
// 2. Delete SocialAccount where userId + provider match
// 3. If user has no password AND no remaining social accounts → reject (would lock out)
```

---

## 5. Password Reset Flow

### Endpoints

```
POST /auth/forgot-password        → Send reset email
POST /auth/reset-password          → Reset with token
POST /auth/change-password         → Change while logged in
```

### Flow

```
User → "Forgot Password" → enters email
  → POST /auth/forgot-password { email }
  → Server generates crypto token (32 bytes, hex)
  → Stores hash of token in User.passwordResetToken (NOT plain token)
  → Sets User.passwordResetExpiry = now + 1 hour
  → Sends email with link: https://app.stunity.com/reset-password?token=<plain_token>
  → User clicks link → enters new password
  → POST /auth/reset-password { token, newPassword }
  → Server hashes submitted token, compares with stored hash
  → If match + not expired → bcrypt new password → save → clear reset fields
  → Invalidate all existing refresh tokens (force re-login everywhere)
```

### Implementation

```typescript
import crypto from 'crypto';

// POST /auth/forgot-password
app.post('/auth/forgot-password',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 5 }), // 5 requests per 15 min
  async (req, res) => {
    const { email } = req.body;

    // Always return success (don't reveal if email exists)
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send email (use your email service)
    await sendResetEmail(user.email, resetToken);

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  }
);

// POST /auth/reset-password
app.post('/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  // Validate password strength (see Section 10)
  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({ error: 'Password does not meet requirements' });
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  // Check password not in recent history
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiry: null,
      passwordChangedAt: new Date(),
      failedAttempts: 0,
      lockedUntil: null,
    },
  });

  res.json({ success: true, message: 'Password reset successful. Please log in.' });
});
```

### Email Service

Use one of these (all have generous free tiers):

| Service | Free Tier | Best For |
|---------|-----------|----------|
| **Resend** | 3,000 emails/month | Developer experience, React Email templates |
| **SendGrid** | 100 emails/day | Enterprise scale |
| **AWS SES** | 62,000 emails/month (from EC2) | Cost at scale |
| **Postmark** | 100 emails/month | Transactional email reliability |

**Recommended:** Resend (simple API, great DX):
```bash
npm install resend
```

```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: 'Stunity <noreply@stunity.com>',
    to: email,
    subject: 'Reset your Stunity password',
    html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="background:#0EA5E9;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">
        Reset Password
      </a>
      <p style="color:#666;margin-top:16px;">If you didn't request this, ignore this email.</p>
    `,
  });
}
```

---

## 6. Two-Factor Authentication (2FA/MFA)

### Method: TOTP (Time-Based One-Time Password)

Compatible with: Google Authenticator, Authy, 1Password, Microsoft Authenticator.

**Package:** `otpauth`  
**Install:** `cd services/auth-service && npm install otpauth qrcode`

### Endpoints

```
POST /auth/2fa/setup          → Generate secret + QR code (authenticated)
POST /auth/2fa/verify-setup   → Verify TOTP + enable 2FA (authenticated)
POST /auth/2fa/verify          → Verify TOTP during login (with challenge token)
POST /auth/2fa/disable         → Disable 2FA (authenticated, requires current TOTP)
POST /auth/2fa/backup-codes   → Regenerate backup codes (authenticated)
```

### Setup Flow

```
User → Settings → "Enable 2FA"
  → POST /auth/2fa/setup (authenticated)
  → Server generates TOTP secret → returns QR code data URL
  → User scans QR with authenticator app
  → User enters 6-digit code from app
  → POST /auth/2fa/verify-setup { code: "123456" }
  → Server verifies code matches secret → enables 2FA
  → Server returns 10 backup codes (show once, user saves them)
```

### Login Flow with 2FA

```
User → Login (email/password OR social)
  → Server validates credentials → checks 2FA enabled
  → If 2FA enabled:
      → Returns { requires2FA: true, challengeToken: "..." } (NOT a full JWT)
      → Client shows TOTP input screen
      → User enters 6-digit code
      → POST /auth/2fa/verify { challengeToken, code: "123456" }
      → Server verifies code → issues full JWT
  → If 2FA not enabled:
      → Returns full JWT immediately (current behavior)
```

### Implementation

```typescript
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

// POST /auth/2fa/setup (authenticated)
app.post('/auth/2fa/setup', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  // Generate TOTP secret
  const totp = new OTPAuth.TOTP({
    issuer: 'Stunity',
    label: req.user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  // Store secret (not yet enabled)
  await prisma.twoFactorSecret.upsert({
    where: { userId },
    create: { userId, secret: totp.secret.base32, isEnabled: false },
    update: { secret: totp.secret.base32, isEnabled: false },
  });

  // Generate QR code
  const qrDataUrl = await QRCode.toDataURL(totp.toString());

  res.json({
    success: true,
    qrCode: qrDataUrl,                    // Display in app
    manualEntry: totp.secret.base32,       // For manual setup
  });
});

// POST /auth/2fa/verify-setup (authenticated — first-time verification)
app.post('/auth/2fa/verify-setup', authenticateToken, async (req, res) => {
  const { code } = req.body;
  const record = await prisma.twoFactorSecret.findUnique({
    where: { userId: req.user.id },
  });

  if (!record) return res.status(400).json({ error: '2FA not set up' });

  const totp = new OTPAuth.TOTP({
    issuer: 'Stunity',
    label: req.user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(record.secret),
  });

  const delta = totp.validate({ token: code, window: 1 }); // Allow ±1 period (±30s)
  if (delta === null) {
    return res.status(400).json({ error: 'Invalid code. Try again.' });
  }

  // Generate 10 backup codes
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase() // e.g. "A1B2C3D4"
  );
  const hashedBackupCodes = await Promise.all(
    backupCodes.map(code => bcrypt.hash(code, 10))
  );

  await prisma.twoFactorSecret.update({
    where: { userId: req.user.id },
    data: {
      isEnabled: true,
      verifiedAt: new Date(),
      backupCodes: hashedBackupCodes,
    },
  });

  res.json({
    success: true,
    backupCodes, // Show ONCE — user must save these
    message: '2FA enabled successfully',
  });
});

// POST /auth/2fa/verify (during login — with challenge token)
app.post('/auth/2fa/verify', async (req, res) => {
  const { challengeToken, code } = req.body;

  // Verify challenge token
  const decoded = jwt.verify(challengeToken, JWT_SECRET) as any;
  if (decoded.purpose !== '2fa_challenge') {
    return res.status(400).json({ error: 'Invalid challenge token' });
  }

  const record = await prisma.twoFactorSecret.findUnique({
    where: { userId: decoded.userId },
  });

  if (!record?.isEnabled) {
    return res.status(400).json({ error: '2FA not enabled' });
  }

  // Try TOTP code first
  const totp = new OTPAuth.TOTP({
    issuer: 'Stunity',
    label: '',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(record.secret),
  });

  let isValid = totp.validate({ token: code, window: 1 }) !== null;

  // If TOTP fails, try backup codes
  if (!isValid) {
    for (let i = 0; i < record.backupCodes.length; i++) {
      if (await bcrypt.compare(code.toUpperCase(), record.backupCodes[i])) {
        isValid = true;
        // Remove used backup code
        const updatedCodes = [...record.backupCodes];
        updatedCodes.splice(i, 1);
        await prisma.twoFactorSecret.update({
          where: { userId: decoded.userId },
          data: { backupCodes: updatedCodes },
        });
        break;
      }
    }
  }

  if (!isValid) {
    return res.status(400).json({ error: 'Invalid 2FA code' });
  }

  // Issue full JWT (same as normal login)
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: { school: true },
  });

  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, schoolId: user.schoolId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
  const refreshToken = jwt.sign(
    { userId: user.id },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRATION }
  );

  res.json({ success: true, user, tokens: { accessToken, refreshToken } });
});
```

---

## 7. Rate Limiting

**Package:** `express-rate-limit`  
**Install:** `cd services/auth-service && npm install express-rate-limit`

### Configuration

```typescript
import rateLimit from 'express-rate-limit';

// ── Global rate limit (all auth endpoints) ──
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minutes
  max: 100,                     // 100 requests per window per IP
  standardHeaders: true,        // Return rate limit info in headers
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again later.' },
});

// ── Strict rate limit for authentication attempts ──
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minutes
  max: 10,                      // 10 login attempts per 15 min per IP
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  skipSuccessfulRequests: true,  // Only count failed attempts
});

// ── Very strict for password reset (prevent email spam) ──
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,    // 1 hour
  max: 3,                       // 3 reset requests per hour per IP
  message: { error: 'Too many reset attempts. Try again in 1 hour.' },
});

// ── 2FA verification limit ──
const twoFactorLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,     // 5 minutes
  max: 5,                       // 5 attempts per 5 min
  message: { error: 'Too many 2FA attempts. Try again in 5 minutes.' },
});

// ── Account creation limit ──
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,    // 1 hour
  max: 5,                       // 5 registrations per hour per IP
  message: { error: 'Too many accounts created. Try again later.' },
});

// Apply middleware
app.use('/auth', globalLimiter);
app.use('/auth/login', authLimiter);
app.use('/auth/parent/login', authLimiter);
app.use('/auth/social', authLimiter);
app.use('/auth/register', registerLimiter);
app.use('/auth/parent/register', registerLimiter);
app.use('/auth/forgot-password', resetLimiter);
app.use('/auth/reset-password', resetLimiter);
app.use('/auth/2fa/verify', twoFactorLimiter);
```

### Production: Redis-Backed Rate Limiting

For Cloud Run with multiple instances, use Redis store:

```bash
npm install rate-limit-redis
```

```typescript
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });

const authLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) }),
  windowMs: 15 * 60 * 1000,
  max: 10,
});
```

---

## 8. Security Headers & Hardening

**Package:** `helmet`  
**Install:** `cd services/auth-service && npm install helmet`

```typescript
import helmet from 'helmet';

// Apply BEFORE routes, AFTER cors
app.use(helmet({
  contentSecurityPolicy: false,   // Disable if auth-service is API-only
  crossOriginEmbedderPolicy: false,
}));

// Additional headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  next();
});
```

### Additional Security Measures

```typescript
// 1. Request size limit (prevent payload attacks)
app.use(express.json({ limit: '10kb' }));

// 2. Parameter pollution protection
// npm install hpp
import hpp from 'hpp';
app.use(hpp());

// 3. Sanitize inputs (prevent NoSQL/SQL injection via JSON)
// Already using Prisma (parameterized queries) — but sanitize input strings:
function sanitizeInput(input: string): string {
  return input.replace(/[<>\"\';\(\)]/g, '').trim();
}
```

---

## 9. Brute Force & Account Lockout

### Policy

| Metric | Threshold | Action |
|--------|-----------|--------|
| Failed login attempts | 5 consecutive | Lock account for 15 minutes |
| Failed login attempts | 10 consecutive | Lock account for 1 hour |
| Failed login attempts | 15 consecutive | Lock account for 24 hours |
| Failed 2FA attempts | 5 per 5 min | Block 2FA verification for 15 min |

### Implementation

The User model already has `failedAttempts` and `lockedUntil` fields. Use them:

```typescript
// In login handler, BEFORE password check:
async function checkAccountLock(user: User): Promise<{ locked: boolean; message?: string }> {
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return { locked: true, message: `Account locked. Try again in ${minutesLeft} minutes.` };
  }
  // If lock expired, reset
  if (user.lockedUntil && user.lockedUntil <= new Date()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });
  }
  return { locked: false };
}

// After FAILED password check:
async function recordFailedAttempt(user: User, ipAddress: string) {
  const attempts = user.failedAttempts + 1;
  let lockDuration: number | null = null;

  if (attempts >= 15) lockDuration = 24 * 60;       // 24 hours
  else if (attempts >= 10) lockDuration = 60;        // 1 hour
  else if (attempts >= 5) lockDuration = 15;         // 15 minutes

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedAttempts: attempts,
      lockedUntil: lockDuration
        ? new Date(Date.now() + lockDuration * 60 * 1000)
        : null,
    },
  });

  // Log attempt for security auditing
  await prisma.loginAttempt.create({
    data: {
      email: user.email,
      ipAddress,
      success: false,
      reason: 'invalid_password',
    },
  });
}

// After SUCCESSFUL login:
async function recordSuccessfulLogin(user: User, ipAddress: string) {
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedAttempts: 0,
      lockedUntil: null,
      lastLogin: new Date(),
      loginCount: { increment: 1 },
    },
  });

  await prisma.loginAttempt.create({
    data: {
      email: user.email,
      ipAddress,
      success: true,
    },
  });
}
```

---

## 10. Password Policy

### Requirements (Enterprise Standard)

| Rule | Requirement |
|------|-------------|
| Minimum length | 8 characters |
| Maximum length | 128 characters |
| Uppercase | At least 1 |
| Lowercase | At least 1 |
| Number | At least 1 |
| Special character | At least 1 (`!@#$%^&*()_+-=[]{}|;:,.<>?`) |
| Common passwords | Block top 10,000 common passwords |
| Password history | Cannot reuse last 5 passwords |

### Implementation

```typescript
const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123',
  'password1', 'iloveyou', 'admin', 'letmein', 'welcome',
  // Load from file: https://github.com/danielmiessler/SecLists/blob/master/Passwords/Common-Credentials/10k-most-common.txt
]);

interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 8) errors.push('At least 8 characters required');
  if (password.length > 128) errors.push('Maximum 128 characters');
  if (!/[A-Z]/.test(password)) errors.push('At least 1 uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('At least 1 lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('At least 1 number');
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) errors.push('At least 1 special character');
  if (COMMON_PASSWORDS.has(password.toLowerCase())) errors.push('This password is too common');

  return { isValid: errors.length === 0, errors };
}

// Check password history (prevent reuse of last 5)
async function isPasswordReused(userId: string, newPassword: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true, lastPasswordHashes: true },
  });
  if (!user) return false;

  const hashesToCheck = [user.password, ...(user.lastPasswordHashes || [])].slice(0, 5);
  for (const hash of hashesToCheck) {
    if (hash && await bcrypt.compare(newPassword, hash)) return true;
  }
  return false;
}
```

### Bcrypt Cost Factor

Upgrade from salt rounds 10 → **12** for new passwords (OWASP recommendation):

```typescript
const BCRYPT_ROUNDS = 12; // ~250ms on modern hardware — good balance
const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
```

---

## 11. Session Security

### JWT Improvements

```typescript
// 1. Shorter access token expiry (from 7d → 15min for sensitive apps, or keep 1h)
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1h';   // Reduced from 7d
const REFRESH_TOKEN_EXPIRATION = '7d';                        // Reduced from 30d

// 2. Add jti (JWT ID) for token revocation capability
import { v4 as uuidv4 } from 'uuid';

const accessToken = jwt.sign(
  {
    userId: user.id,
    email: user.email,
    role: user.role,
    schoolId: user.schoolId,
    jti: uuidv4(),                    // Unique token ID
    iat: Math.floor(Date.now() / 1000),
  },
  JWT_SECRET,
  { expiresIn: JWT_EXPIRATION }
);

// 3. Invalidate tokens on password change
// After password change, update passwordChangedAt
// In auth middleware, check:
if (user.passwordChangedAt) {
  const changedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
  if (decoded.iat < changedTimestamp) {
    return res.status(401).json({ error: 'Password changed. Please log in again.' });
  }
}
```

### Refresh Token Rotation

```typescript
// POST /auth/refresh
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: { school: true },
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  // Issue NEW access token + NEW refresh token (rotation)
  const newAccessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, schoolId: user.schoolId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
  const newRefreshToken = jwt.sign(
    { userId: user.id },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRATION }
  );

  // Old refresh token is now invalid (one-time use)
  res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
});
```

---

## 12. Mobile Implementation

### Packages to Install

```bash
cd apps/mobile
npx expo install expo-auth-session expo-crypto expo-web-browser
npx expo install @react-native-google-signin/google-signin  # Google
npx expo install expo-apple-authentication                    # Apple
```

### Google Sign-In (Mobile)

```typescript
// apps/mobile/src/services/socialAuth.ts
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: process.env.GOOGLE_EXPO_CLIENT_ID,
    iosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.GOOGLE_WEB_CLIENT_ID,
  });

  const signInWithGoogle = async () => {
    const result = await promptAsync();
    if (result.type === 'success') {
      const { id_token } = result.params;

      // Send to YOUR backend
      const response = await fetch(`${API_URL}/auth/social/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: id_token }),
      });

      const data = await response.json();

      if (data.requires2FA) {
        // Navigate to 2FA verification screen
        return { requires2FA: true, challengeToken: data.challengeToken };
      }

      // Store tokens (same as email login)
      await tokenService.saveTokens(data.tokens.accessToken, data.tokens.refreshToken);
      return { user: data.user, tokens: data.tokens };
    }
  };

  return { signInWithGoogle, isReady: !!request };
}
```

### Apple Sign-In (Mobile)

```typescript
import * as AppleAuthentication from 'expo-apple-authentication';

export async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  const response = await fetch(`${API_URL}/auth/social/apple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identityToken: credential.identityToken,
      authorizationCode: credential.authorizationCode,
      fullName: credential.fullName,
    }),
  });

  return await response.json();
}
```

### Update LoginScreen.tsx

Replace the placeholder `handleSocialLogin` with actual implementations:

```typescript
// In apps/mobile/src/screens/auth/LoginScreen.tsx
// Replace the "Coming Soon" alert with:

const { signInWithGoogle, isReady: googleReady } = useGoogleAuth();

const handleGoogleLogin = async () => {
  try {
    const result = await signInWithGoogle();
    if (result.requires2FA) {
      navigation.navigate('TwoFactorVerify', { challengeToken: result.challengeToken });
    } else {
      // Same flow as email login success
      setUser(result.user);
    }
  } catch (error) {
    setError('Google sign-in failed. Please try again.');
  }
};
```

---

## 13. Web Implementation

### Google Sign-In (Web)

Use Google Identity Services (new SDK, replaces deprecated gapi):

```typescript
// apps/web/src/lib/auth/googleAuth.ts

export function initGoogleSignIn(callback: (idToken: string) => void) {
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.onload = () => {
    google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      callback: (response) => callback(response.credential),
    });
    google.accounts.id.renderButton(
      document.getElementById('google-signin-button')!,
      { theme: 'outline', size: 'large', width: '100%' }
    );
  };
  document.head.appendChild(script);
}
```

### Facebook Login (Web)

```typescript
// apps/web/src/lib/auth/facebookAuth.ts

export function initFacebookLogin(callback: (accessToken: string) => void) {
  window.fbAsyncInit = () => {
    FB.init({ appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID, version: 'v18.0' });
  };

  // Load SDK
  const script = document.createElement('script');
  script.src = 'https://connect.facebook.net/en_US/sdk.js';
  document.head.appendChild(script);
}

export function loginWithFacebook(): Promise<string> {
  return new Promise((resolve, reject) => {
    FB.login((response) => {
      if (response.authResponse) {
        resolve(response.authResponse.accessToken);
      } else {
        reject(new Error('Facebook login cancelled'));
      }
    }, { scope: 'email,public_profile' });
  });
}
```

---

## 14. Environment Variables

### Add to `.env`

```bash
# ─── OAuth2 Providers ───────────────────────────────────────

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com

# Apple Sign In
APPLE_CLIENT_ID=com.stunity.app                    # Bundle ID for mobile
APPLE_WEB_CLIENT_ID=com.stunity.web                # Services ID for web
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID

# Facebook Login
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# LinkedIn
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# ─── Email Service ───────────────────────────────────────────
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@stunity.com

# ─── Security ────────────────────────────────────────────────
BCRYPT_ROUNDS=12
JWT_EXPIRATION=1h                                   # Reduced from 7d
REFRESH_TOKEN_EXPIRATION=7d                         # Reduced from 30d
RATE_LIMIT_WINDOW_MS=900000                         # 15 minutes
RATE_LIMIT_MAX_AUTH=10                              # Max auth attempts per window
APP_URL=https://app.stunity.com                     # For password reset links

# ─── Redis (for rate limiting in production) ──────────────────
REDIS_URL=redis://default:xxx@xxx.upstash.io:6379
```

---

## 15. Testing Checklist

### OAuth2 Social Login
- [ ] Google login → new user created → JWT returned
- [ ] Google login → existing email → account linked → JWT returned
- [ ] Google login → returning user → JWT returned immediately
- [ ] Apple login → relay email handled correctly
- [ ] Apple login → name captured on first login only
- [ ] Facebook login → email permission required
- [ ] LinkedIn login → authorization code exchanged correctly
- [ ] Social login with claim code → school linked
- [ ] Social login with 2FA enabled → challenge returned → verify → JWT
- [ ] Link additional provider from settings (authenticated)
- [ ] Unlink provider → blocked if no other login method exists
- [ ] Social-only user → can set password via settings

### Password Reset
- [ ] Forgot password → email sent with valid token
- [ ] Forgot password → non-existent email → same success response (no info leak)
- [ ] Reset with valid token → password updated → old tokens invalidated
- [ ] Reset with expired token → rejected
- [ ] Reset with already-used token → rejected
- [ ] Rate limited to 3 per hour per IP

### 2FA/MFA
- [ ] Setup → QR code generated → scan with authenticator
- [ ] Verify setup → valid code → 2FA enabled → backup codes shown
- [ ] Login with 2FA → challenge token returned → TOTP verified → JWT issued
- [ ] Login with 2FA → backup code used → works → code consumed
- [ ] Invalid TOTP → rejected → rate limited after 5 attempts
- [ ] Disable 2FA → requires current TOTP code

### Rate Limiting
- [ ] 11th login attempt in 15 min → blocked
- [ ] 4th forgot-password in 1 hour → blocked
- [ ] Rate limit headers present in response
- [ ] Successful requests don't count toward auth limiter

### Account Lockout
- [ ] 5 failed passwords → account locked 15 min
- [ ] 10 failed → locked 1 hour
- [ ] 15 failed → locked 24 hours
- [ ] Successful login → counter reset
- [ ] Lock expiry → counter reset → can login again

### Password Policy
- [ ] Registration with weak password → rejected with specific errors
- [ ] Common password (e.g., "password1") → rejected
- [ ] Password reuse (last 5) → rejected
- [ ] Valid strong password → accepted

---

## 16. Implementation Order

### Phase 1 — Security Foundation (Do First)

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 1 | Install helmet + apply security headers | Critical | 15 min |
| 2 | Install express-rate-limit + apply to all auth routes | Critical | 30 min |
| 3 | Implement brute force / account lockout logic | Critical | 1-2 hours |
| 4 | Enforce password policy (validation function) | High | 1 hour |
| 5 | Reduce JWT expiry (7d → 1h access, 30d → 7d refresh) | High | 15 min |

### Phase 2 — Password Reset

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 6 | Set up email service (Resend) | High | 30 min |
| 7 | Implement POST /auth/forgot-password | High | 1-2 hours |
| 8 | Implement POST /auth/reset-password | High | 1-2 hours |
| 9 | Build ForgotPassword + ResetPassword screens (mobile) | High | 2-3 hours |
| 10 | Build reset password page (web) | High | 1-2 hours |

### Phase 3 — OAuth2 Social Login

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 11 | Add SocialAccount model + migrate DB | Required | 30 min |
| 12 | Implement Google backend verification | High | 1-2 hours |
| 13 | Implement Apple backend verification | High | 1-2 hours |
| 14 | Implement unified handleSocialLogin logic | High | 2-3 hours |
| 15 | Wire up mobile Google Sign-In (expo-auth-session) | High | 2-3 hours |
| 16 | Wire up mobile Apple Sign-In (expo-apple-authentication) | High | 1-2 hours |
| 17 | Wire up web Google + Facebook login buttons | Medium | 2-3 hours |
| 18 | Implement Facebook backend verification | Medium | 1-2 hours |
| 19 | Implement LinkedIn backend verification | Low | 1-2 hours |
| 20 | Account linking/unlinking endpoints | Medium | 1-2 hours |

### Phase 4 — Two-Factor Authentication

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 21 | Add TwoFactorSecret model + migrate DB | Required | 15 min |
| 22 | Implement 2FA setup + verify-setup endpoints | High | 2-3 hours |
| 23 | Integrate 2FA challenge into login + social login flows | High | 2-3 hours |
| 24 | Build 2FA setup screen (mobile) | High | 2-3 hours |
| 25 | Build 2FA verification screen (mobile) | High | 1-2 hours |
| 26 | Build 2FA settings page (web) | Medium | 2-3 hours |

---

## 📚 Dependencies Summary

### Backend (`services/auth-service/`)

```bash
cd services/auth-service

# Security
npm install helmet express-rate-limit hpp

# OAuth2
npm install google-auth-library apple-signin-auth

# 2FA
npm install otpauth qrcode
npm install -D @types/qrcode

# Email
npm install resend

# Redis rate limiting (production)
npm install rate-limit-redis
```

### Mobile (`apps/mobile/`)

```bash
cd apps/mobile

# OAuth
npx expo install expo-auth-session expo-crypto expo-web-browser
npx expo install expo-apple-authentication
```

### Database (`packages/database/`)

```bash
cd packages/database
# After adding models to schema.prisma:
npx prisma migrate dev --name add_oauth2_security_models
npx prisma generate
```

---

## 🔒 Security Comparison: Before vs After

| Feature | Before | After |
|---------|--------|-------|
| Login methods | Email/password only | Email + Google + Apple + Facebook + LinkedIn |
| Rate limiting | ❌ None | ✅ Per-endpoint limits |
| Brute force protection | ❌ None | ✅ Progressive lockout (5/10/15 attempts) |
| Security headers | ❌ None | ✅ Helmet (13 headers) |
| Password policy | 6-char minimum | 8+ chars, uppercase, lowercase, number, special, common-password block |
| Password reset | ❌ Not implemented | ✅ Secure token flow with email |
| 2FA/MFA | ❌ None | ✅ TOTP + backup codes |
| JWT expiry | 7 days access | 1 hour access (configurable) |
| Refresh tokens | 30 days, no rotation | 7 days with rotation |
| Login auditing | ❌ None | ✅ LoginAttempt table with IP tracking |
| Account lockout | Fields exist, not used | ✅ Progressive lockout enforced |
| Bcrypt rounds | 10 | 12 (OWASP recommendation) |

---

*This document covers every aspect needed to bring Stunity auth to enterprise-grade security. Implement in the order specified in Section 16 — security foundation first, then features.*
