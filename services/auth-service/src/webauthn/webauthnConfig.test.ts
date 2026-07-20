import assert from "node:assert/strict";
import test from "node:test";
import { loadWebAuthnSettings } from "./webauthnConfig";

const ENV_KEYS = ["WEBAUTHN_RP_ID", "WEBAUTHN_RP_NAME", "WEBAUTHN_ORIGIN"] as const;

function withEnv(t: any, values: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  const previous = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) process.env[key] = value;
  t.after(() => {
    for (const key of ENV_KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key]!;
    }
  });
}

test("loadWebAuthnSettings requires rpId, rpName and at least one origin", (t) => {
  withEnv(t, {});
  assert.equal(loadWebAuthnSettings(), null);

  withEnv(t, { WEBAUTHN_RP_ID: "stunity.example" });
  assert.equal(loadWebAuthnSettings(), null);

  withEnv(t, { WEBAUTHN_RP_ID: "stunity.example", WEBAUTHN_RP_NAME: "Stunity", WEBAUTHN_ORIGIN: "" });
  assert.equal(loadWebAuthnSettings(), null);
});

test("loadWebAuthnSettings splits comma-separated origins", (t) => {
  withEnv(t, {
    WEBAUTHN_RP_ID: "stunity.example",
    WEBAUTHN_RP_NAME: "Stunity",
    WEBAUTHN_ORIGIN: "https://app.stunity.example, https://stunity.example ",
  });
  const settings = loadWebAuthnSettings();
  assert.ok(settings);
  assert.equal(settings?.rpId, "stunity.example");
  assert.deepEqual(settings?.origins, ["https://app.stunity.example", "https://stunity.example"]);
});
