import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const migrationsRoot = fileURLToPath(new URL("../../packages/database/prisma/migrations/", import.meta.url));

async function sqlFor(directory) {
  return readFile(`${migrationsRoot}${directory}/migration.sql`, "utf8");
}

test("Phase 4 migration persists only passkey public material and hashed sessions", async () => {
  const sql = await sqlFor("20260720200000_passkey_auth_sessions_phase4");
  assert.match(sql, /CREATE TABLE "passkey_credentials"/);
  assert.match(sql, /"publicKey" BYTEA NOT NULL/);
  assert.match(sql, /CREATE TABLE "auth_sessions"/);
  assert.match(sql, /"refreshTokenHash" TEXT NOT NULL/);
  assert.doesNotMatch(sql, /refreshToken"/);
  assert.doesNotMatch(sql, /accessToken"/);
});

test("Phase 5 migration creates membership invariants and safe backfill sources", async () => {
  const sql = await sqlFor("20260720210000_school_memberships_phase5");
  assert.match(sql, /CREATE TYPE "SchoolMembershipStatus"/);
  assert.match(sql, /CREATE UNIQUE INDEX "school_memberships_userId_schoolId_key"/);
  assert.match(sql, /CREATE UNIQUE INDEX "school_memberships_studentId_key"/);
  assert.match(sql, /FROM "school_link_requests" r/);
  assert.match(sql, /FROM "users" u/);
  assert.match(sql, /ON CONFLICT DO NOTHING/);
});

