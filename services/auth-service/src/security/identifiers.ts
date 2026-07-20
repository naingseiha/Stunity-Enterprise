const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

/**
 * Canonicalize phone numbers for authentication storage and lookup.
 * Cambodia is the product default, while explicit international numbers remain supported.
 */
export function normalizePhone(
  value: unknown,
  defaultCallingCode = "855",
): string | null {
  if (typeof value !== "string") return null;

  let input = value.trim();
  if (!input) return null;

  input = input.replace(/[\s().-]/g, "");
  if (input.startsWith("00")) input = `+${input.slice(2)}`;

  let canonical: string;
  if (input.startsWith("+")) {
    canonical = `+${input.slice(1).replace(/\D/g, "")}`;
  } else {
    const digits = input.replace(/\D/g, "");
    if (!digits) return null;
    if (digits.startsWith(defaultCallingCode)) {
      canonical = `+${digits}`;
    } else {
      canonical = `+${defaultCallingCode}${digits.replace(/^0+/, "")}`;
    }
  }

  return E164_PATTERN.test(canonical) ? canonical : null;
}

/** Keep exact legacy values searchable while new writes use canonical values. */
export function phoneLookupCandidates(value: unknown): string[] {
  if (typeof value !== "string") return [];
  const raw = value.trim();
  const canonical = normalizePhone(raw);
  const candidates = new Set<string>();
  if (raw) candidates.add(raw);
  if (canonical) {
    candidates.add(canonical);
    if (canonical.startsWith("+855")) candidates.add(`0${canonical.slice(4)}`);
  }
  return [...candidates];
}

export function maskNamePart(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return `${Array.from(trimmed)[0]}${"•".repeat(Math.min(Math.max(Array.from(trimmed).length - 1, 1), 5))}`;
}

export function maskRosterName(firstName: unknown, lastName: unknown): string {
  return [maskNamePart(firstName), maskNamePart(lastName)]
    .filter(Boolean)
    .join(" ");
}
