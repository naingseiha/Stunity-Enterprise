-- Phase 3 foundation: Telegram becomes a federated OIDC provider alongside
-- Google/Apple/Facebook/LinkedIn. No new tables — Telegram credentials reuse
-- the existing SocialAccount model via provider + providerUserId.

ALTER TYPE "SocialProvider" ADD VALUE 'TELEGRAM';
