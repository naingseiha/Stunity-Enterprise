import assert from "node:assert/strict";
import test from "node:test";
import { hashOtp, safeHashEquals } from "./otpCrypto";

test("OTP hashing is challenge and destination bound", () => {
  const expected = hashOtp("challenge-1", "+85512123456", "123456");
  assert.equal(safeHashEquals(expected, hashOtp("challenge-1", "+85512123456", "123456")), true);
  assert.equal(safeHashEquals(expected, hashOtp("challenge-2", "+85512123456", "123456")), false);
  assert.equal(safeHashEquals(expected, hashOtp("challenge-1", "+85512999999", "123456")), false);
  assert.equal(safeHashEquals(expected, hashOtp("challenge-1", "+85512123456", "654321")), false);
});
