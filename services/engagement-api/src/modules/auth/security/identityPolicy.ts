export type IdentityKind = "PASSWORD" | "PHONE" | "EMAIL" | "TELEGRAM" | "SOCIAL" | "PASSKEY";

export type IdentityInventory = {
  hasUsablePassword: boolean;
  verifiedPhoneCount: number;
  verifiedEmailCount: number;
  linkedTelegramCount: number;
  linkedSocialCount: number;
  activePasskeyCount: number;
};

export type IdentityRemovalDecision =
  | { allowed: true; remainingMethods: number }
  | { allowed: false; remainingMethods: 0; code: "LAST_METHOD_REQUIRED" };

function positiveCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function countUsableIdentities(inventory: IdentityInventory): number {
  return (inventory.hasUsablePassword ? 1 : 0)
    + positiveCount(inventory.verifiedPhoneCount)
    + positiveCount(inventory.verifiedEmailCount)
    + positiveCount(inventory.linkedTelegramCount)
    + positiveCount(inventory.linkedSocialCount)
    + positiveCount(inventory.activePasskeyCount);
}

export function canRemoveIdentity(
  inventory: IdentityInventory,
  identity: IdentityKind,
): IdentityRemovalDecision {
  const total = countUsableIdentities(inventory);
  const removalCount = identity === "PASSWORD" ? (inventory.hasUsablePassword ? 1 : 0)
    : identity === "PHONE" ? (inventory.verifiedPhoneCount > 0 ? 1 : 0)
      : identity === "EMAIL" ? (inventory.verifiedEmailCount > 0 ? 1 : 0)
        : identity === "TELEGRAM" ? (inventory.linkedTelegramCount > 0 ? 1 : 0)
          : identity === "SOCIAL" ? (inventory.linkedSocialCount > 0 ? 1 : 0)
            : inventory.activePasskeyCount > 0 ? 1 : 0;
  const remainingMethods = Math.max(0, total - removalCount);
  if (remainingMethods === 0) return { allowed: false, remainingMethods: 0, code: "LAST_METHOD_REQUIRED" };
  return { allowed: true, remainingMethods };
}

