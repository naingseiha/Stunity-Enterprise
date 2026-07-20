/** Canonical claim QR payload consumed by the mobile and web auth flows. */
export function buildClaimDeepLink(code: string): string {
  return `stunity://claim?code=${encodeURIComponent(code.trim().toUpperCase())}`;
}
