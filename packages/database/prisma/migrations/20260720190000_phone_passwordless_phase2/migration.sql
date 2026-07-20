-- Phase 2 foundation: verified authentication contacts and privacy-safe OTP audit events.

CREATE TYPE "ContactType" AS ENUM ('PHONE', 'EMAIL');
CREATE TYPE "OtpAuthEventType" AS ENUM ('REQUESTED', 'SENT', 'FAILED', 'VERIFIED', 'RATE_LIMITED', 'ENROLLED');

CREATE TABLE "verified_contacts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "displayValue" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "verified_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "otp_auth_audit_events" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT,
    "userId" TEXT,
    "destinationHash" TEXT NOT NULL,
    "eventType" "OtpAuthEventType" NOT NULL,
    "channel" TEXT,
    "purpose" TEXT NOT NULL,
    "reasonCode" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "otp_auth_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "verified_contacts_type_normalizedValue_key"
ON "verified_contacts"("type", "normalizedValue");
CREATE INDEX "verified_contacts_userId_type_idx" ON "verified_contacts"("userId", "type");
CREATE INDEX "otp_auth_audit_events_challengeId_createdAt_idx" ON "otp_auth_audit_events"("challengeId", "createdAt");
CREATE INDEX "otp_auth_audit_events_userId_createdAt_idx" ON "otp_auth_audit_events"("userId", "createdAt");
CREATE INDEX "otp_auth_audit_events_destinationHash_createdAt_idx" ON "otp_auth_audit_events"("destinationHash", "createdAt");
CREATE INDEX "otp_auth_audit_events_eventType_createdAt_idx" ON "otp_auth_audit_events"("eventType", "createdAt");

ALTER TABLE "verified_contacts" ADD CONSTRAINT "verified_contacts_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Email has an explicit verification bit today, so it can be safely migrated.
-- Existing phone projections are deliberately not promoted to verified contacts
-- because the legacy User model has no trustworthy phone-verification marker.
WITH unique_verified_emails AS (
    SELECT DISTINCT ON (LOWER(TRIM("email")))
        "id" AS "userId",
        LOWER(TRIM("email")) AS "normalizedValue",
        "email" AS "displayValue",
        COALESCE("verifiedAt", "updatedAt") AS "verifiedAt"
    FROM "users"
    WHERE "email" IS NOT NULL
      AND "isEmailVerified" = true
    ORDER BY LOWER(TRIM("email")), "createdAt", "id"
)
INSERT INTO "verified_contacts" (
    "id", "userId", "type", "normalizedValue", "displayValue", "verifiedAt", "isPrimary", "updatedAt"
)
SELECT
    'vc_' || replace(gen_random_uuid()::text, '-', ''),
    "userId", 'EMAIL', "normalizedValue", "displayValue", "verifiedAt", true, CURRENT_TIMESTAMP
FROM unique_verified_emails;
