import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("./passwordless-migration-preflight.mjs", import.meta.url));

test("preflight connection failures do not echo database host details", () => {
  const result = spawnSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    env: {
      ...process.env,
      DIRECT_URL: "postgresql://user:secret@passwordless-preflight.invalid/db",
      DATABASE_URL: "",
    },
  });

  assert.equal(result.status, 2);
  const output = `${result.stdout}${result.stderr}`;
  assert.match(output, /could not connect to the configured database \(ENOTFOUND\)/);
  assert.doesNotMatch(output, /passwordless-preflight\.invalid/);
  assert.doesNotMatch(output, /secret/);
});
