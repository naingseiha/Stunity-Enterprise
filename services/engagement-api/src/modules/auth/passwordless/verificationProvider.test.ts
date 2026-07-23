import assert from "node:assert/strict";
import test from "node:test";
import { selectVerificationProvider, type VerificationChannelProvider } from "./verificationProvider";

function provider(channel: "TELEGRAM" | "SMS", available: boolean): VerificationChannelProvider {
  return {
    channel,
    canSend: async () => ({ available }),
    send: async () => ({ receiptId: `${channel}-receipt`, acceptedAt: new Date() }),
  };
}

test("AUTO selects Telegram first and advertises SMS fallback", async () => {
  const selected = await selectVerificationProvider({
    telegram: provider("TELEGRAM", true),
    sms: provider("SMS", true),
  }, "+85512123456", "AUTO");
  assert.equal(selected.provider.channel, "TELEGRAM");
  assert.equal(selected.smsFallbackAvailable, true);
});

test("AUTO selects SMS when Telegram is unavailable", async () => {
  const selected = await selectVerificationProvider({
    telegram: provider("TELEGRAM", false),
    sms: provider("SMS", true),
  }, "+85512123456", "AUTO");
  assert.equal(selected.provider.channel, "SMS");
});
