import assert from "node:assert/strict";
import test from "node:test";
import {
  maskRosterName,
  normalizeEmail,
  normalizePhone,
  phoneLookupCandidates,
} from "./identifiers";

test("normalizes email consistently", () => {
  assert.equal(normalizeEmail("  Student@Example.COM "), "student@example.com");
  assert.equal(normalizeEmail("  "), null);
});

test("normalizes Cambodia local and explicit international phones to E.164", () => {
  assert.equal(normalizePhone("012 345 678"), "+85512345678");
  assert.equal(normalizePhone("855-12-345-678"), "+85512345678");
  assert.equal(normalizePhone("(+1) 415-555-2671"), "+14155552671");
  assert.equal(normalizePhone("not-a-phone"), null);
});

test("keeps legacy Cambodia phone variants available for lookup", () => {
  assert.deepEqual(phoneLookupCandidates("012 345 678"), [
    "012 345 678",
    "+85512345678",
    "012345678",
  ]);
});

test("masks roster names without exposing the full value", () => {
  assert.equal(maskRosterName("Sokha", "Chan"), "S•••• C•••");
  assert.equal(maskRosterName("សុខា", "ចាន់"), "ស••• ច•••");
});
