import assert from "node:assert/strict";
import test from "node:test";
import { canRemoveIdentity, countUsableIdentities, type IdentityInventory } from "./identityPolicy";

const baseInventory: IdentityInventory = {
  hasUsablePassword: false,
  verifiedPhoneCount: 0,
  verifiedEmailCount: 0,
  linkedTelegramCount: 0,
  linkedSocialCount: 0,
  activePasskeyCount: 0,
};

test("only verified or usable credentials count toward recovery", () => {
  assert.equal(countUsableIdentities({ ...baseInventory, verifiedPhoneCount: 1, activePasskeyCount: 2 }), 3);
  assert.equal(countUsableIdentities({ ...baseInventory, verifiedPhoneCount: -1, activePasskeyCount: Number.NaN }), 0);
});

test("the last usable method cannot be removed", () => {
  for (const identity of ["PASSWORD", "PHONE", "EMAIL", "TELEGRAM", "SOCIAL", "PASSKEY"] as const) {
    const inventory = identity === "PASSWORD"
      ? { ...baseInventory, hasUsablePassword: true }
      : identity === "PHONE"
        ? { ...baseInventory, verifiedPhoneCount: 1 }
        : identity === "EMAIL"
          ? { ...baseInventory, verifiedEmailCount: 1 }
          : identity === "TELEGRAM"
            ? { ...baseInventory, linkedTelegramCount: 1 }
            : identity === "SOCIAL"
              ? { ...baseInventory, linkedSocialCount: 1 }
              : { ...baseInventory, activePasskeyCount: 1 };
    assert.deepEqual(canRemoveIdentity(inventory, identity), {
      allowed: false,
      remainingMethods: 0,
      code: "LAST_METHOD_REQUIRED",
    });
  }
});

test("removing one of several methods remains allowed", () => {
  const inventory = { ...baseInventory, verifiedPhoneCount: 2, linkedTelegramCount: 1 };
  assert.deepEqual(canRemoveIdentity(inventory, "PHONE"), { allowed: true, remainingMethods: 2 });
  assert.deepEqual(canRemoveIdentity(inventory, "TELEGRAM"), { allowed: true, remainingMethods: 2 });
  assert.deepEqual(canRemoveIdentity(inventory, "EMAIL"), { allowed: true, remainingMethods: 3 });
});

