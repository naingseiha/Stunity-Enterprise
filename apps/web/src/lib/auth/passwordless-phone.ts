const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

/**
 * Build an E.164 preview for the phone-first UI.
 * Cambodia is the default, but an explicit international number is preserved.
 * The auth service normalizes the value again before using it.
 */
export function normalizePhonePreview(
  value: string,
  defaultCallingCode = "855",
): string | null {
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
    canonical = digits.startsWith(defaultCallingCode)
      ? `+${digits}`
      : `+${defaultCallingCode}${digits.replace(/^0+/, "")}`;
  }

  return E164_PATTERN.test(canonical) ? canonical : null;
}
