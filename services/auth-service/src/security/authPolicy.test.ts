import assert from "node:assert/strict";
import test from "node:test";
import {
  isPasswordHashUsable,
  publicRegistrationAuthorization,
  resolveUnlinkedSocialAccount,
} from "./authPolicy";

test("public registration always receives safe General Account authorization", () => {
  assert.deepEqual(publicRegistrationAuthorization(), {
    role: "STUDENT",
    accountType: "HYBRID",
    schoolId: null,
  });
});

test("password eligibility depends on the credential, not school affiliation classification", () => {
  const hash = "$2b$12$3euPcmQFCiblsZeEu5s7p.9BXZOr.O8jOju6gWXfG5EB31PVq09w2";
  assert.equal(isPasswordHashUsable(hash), true);
  assert.equal(isPasswordHashUsable(""), false);
});

test("an unlinked provider never silently attaches to an email-matching account", () => {
  assert.equal(
    resolveUnlinkedSocialAccount(false, true),
    "REQUIRE_AUTHENTICATED_LINK",
  );
  assert.equal(
    resolveUnlinkedSocialAccount(false, false),
    "CREATE_GENERAL_ACCOUNT",
  );
  assert.equal(
    resolveUnlinkedSocialAccount(true, true),
    "RETURNING_PROVIDER_ACCOUNT",
  );
});
