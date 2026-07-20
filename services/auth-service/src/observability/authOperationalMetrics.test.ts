import assert from "node:assert/strict";
import test from "node:test";
import { createStructuredAuthMetrics } from "./authOperationalMetrics";

test("structured auth metrics keep only bounded labels", () => {
  const events: any[] = [];
  const metrics = createStructuredAuthMetrics({
    enabled: true,
    emit: (event) => events.push(event),
    now: () => new Date("2026-07-20T00:00:00.000Z"),
  });

  metrics.increment("auth_otp_failed_total", {
    channel: "TELEGRAM",
    reason: "+85512123456",
    userId: "user-secret",
  });

  assert.deepEqual(events, [
    {
      type: "operational_metric",
      metric: "auth_otp_failed_total",
      value: 1,
      labels: { channel: "TELEGRAM", reason: "OTHER" },
      timestamp: "2026-07-20T00:00:00.000Z",
    },
  ]);
  assert.ok(!JSON.stringify(events).includes("+85512123456"));
  assert.ok(!JSON.stringify(events).includes("user-secret"));
});

test("school-link free text cannot become a metric label", () => {
  const events: any[] = [];
  const metrics = createStructuredAuthMetrics({
    enabled: true,
    emit: (event) => events.push(event),
  });
  metrics.increment("school_link_rejected_total", {
    reason_code: "Student phone +85512123456",
  });
  assert.deepEqual(events[0].labels, { reason_code: "UNSPECIFIED" });
  assert.ok(!JSON.stringify(events).includes("+85512123456"));
});

test("structured auth metrics are disabled unless explicitly enabled", () => {
  const events: any[] = [];
  const metrics = createStructuredAuthMetrics({
    enabled: false,
    emit: (event) => events.push(event),
  });
  metrics.increment("auth_otp_started_total", {
    channel: "SMS",
    purpose: "SIGN_IN",
  });
  assert.deepEqual(events, []);
});

test("metric emitter failures never escape into auth flows", () => {
  const metrics = createStructuredAuthMetrics({
    enabled: true,
    emit: () => {
      throw new Error("logging unavailable");
    },
  });
  assert.doesNotThrow(() =>
    metrics.increment("auth_otp_delivered_total", { channel: "SMS" }),
  );
});
