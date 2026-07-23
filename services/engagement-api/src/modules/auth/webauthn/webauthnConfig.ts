export type WebAuthnSettings = {
  rpId: string;
  rpName: string;
  origins: string[];
};

/**
 * The Relying Party ID must be the app's domain (no scheme/port) and every
 * accepted origin must be an exact https(s) origin that serves that domain.
 * Both are env-driven rather than hard-coded so staging/production can use
 * different domains without a code change.
 */
export function loadWebAuthnSettings(): WebAuthnSettings | null {
  const rpId = process.env.WEBAUTHN_RP_ID?.trim();
  const rpName = process.env.WEBAUTHN_RP_NAME?.trim();
  const originsRaw = process.env.WEBAUTHN_ORIGIN?.trim();
  if (!rpId || !rpName || !originsRaw) return null;
  const origins = originsRaw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!origins.length) return null;
  return { rpId, rpName, origins };
}
