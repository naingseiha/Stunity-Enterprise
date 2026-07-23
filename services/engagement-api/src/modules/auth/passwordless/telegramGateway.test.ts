import assert from "node:assert/strict";
import test from "node:test";
import { TelegramGatewayProvider } from "./verificationProvider";

test("Telegram Gateway reuses checkSendAbility request_id and verifies conversion", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ method: string; body: any }> = [];
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body || "{}"));
    const method = String(_input).split("/").pop() || "";
    calls.push({ method, body });
    const result = method === "checkSendAbility"
      ? { request_id: "tg-request-1" }
      : method === "sendVerificationMessage"
        ? { request_id: "tg-request-1" }
        : { request_id: "tg-request-1", verification_status: { status: "code_valid" } };
    return new Response(JSON.stringify({ ok: true, result }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;

  try {
    const provider = new TelegramGatewayProvider("test-token");
    const ability = await provider.canSend("+85512123456");
    assert.equal(ability.available, true);
    const sent = await provider.send({
      destination: "+85512123456",
      code: "123456",
      ttlSeconds: 300,
      requestId: "otp-test-1",
      providerRequestId: ability.providerRequestId,
    });
    assert.equal(sent.receiptId, "tg-request-1");
    assert.deepEqual(await provider.verify({ receiptId: sent.receiptId, code: "123456" }), { valid: true, reasonCode: "code_valid" });
    assert.equal(calls[1].body.request_id, "tg-request-1");
    assert.equal(calls[1].body.phone_number, "+85512123456");
    assert.equal(calls[1].body.code, "123456");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
