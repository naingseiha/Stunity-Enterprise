import crypto from "node:crypto";

function otpSecret(): string {
  const secret = process.env.OTP_HMAC_SECRET || process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && (!process.env.OTP_HMAC_SECRET || process.env.OTP_HMAC_SECRET.length < 32)) {
    throw new Error("FATAL: OTP_HMAC_SECRET with at least 32 characters is required in production.");
  }
  return secret || "local-passwordless-otp-secret-not-for-production";
}

export function generateOtpCode(): string {
  if (process.env.NODE_ENV !== "production" && /^\d{6}$/.test(process.env.OTP_LOCAL_TEST_CODE || "")) {
    return process.env.OTP_LOCAL_TEST_CODE!;
  }
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashOtp(challengeId: string, destination: string, code: string): string {
  return crypto
    .createHmac("sha256", otpSecret())
    .update(`otp:v1:${challengeId}:${destination}:${code}`)
    .digest("hex");
}

export function hashOtpDestination(destination: string): string {
  return crypto.createHmac("sha256", otpSecret()).update(`destination:v1:${destination}`).digest("hex");
}

export function safeHashEquals(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export function hashLimitKey(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
