import assert from "node:assert/strict";
import test from "node:test";
import { clientSubnetBucket } from "./networkIdentifiers";

test("groups IPv4 and IPv4-mapped addresses by /24", () => {
  assert.equal(clientSubnetBucket("192.0.2.17"), "v4:192.0.2.0/24");
  assert.equal(clientSubnetBucket("::ffff:192.0.2.99"), "v4:192.0.2.0/24");
  assert.notEqual(
    clientSubnetBucket("192.0.3.1"),
    clientSubnetBucket("192.0.2.1"),
  );
});

test("groups expanded and compressed IPv6 addresses by /64", () => {
  assert.equal(
    clientSubnetBucket("2001:db8:abcd:12::1"),
    "v6:2001:0db8:abcd:0012::/64",
  );
  assert.equal(
    clientSubnetBucket("2001:0db8:abcd:0012:ffff::99"),
    "v6:2001:0db8:abcd:0012::/64",
  );
  assert.notEqual(
    clientSubnetBucket("2001:db8:abcd:13::1"),
    clientSubnetBucket("2001:db8:abcd:12::1"),
  );
  assert.equal(
    clientSubnetBucket("2001:db8:abcd:12::192.0.2.1"),
    "v6:2001:0db8:abcd:0012::/64",
  );
});

test("invalid client IPs collapse to a bounded unknown bucket", () => {
  assert.equal(clientSubnetBucket("not-an-ip"), "unknown");
});
