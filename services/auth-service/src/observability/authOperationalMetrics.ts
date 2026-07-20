export type AuthMetricName =
  | "auth_otp_started_total"
  | "auth_otp_delivered_total"
  | "auth_otp_verified_total"
  | "auth_otp_failed_total"
  | "auth_otp_fallback_total"
  | "auth_login_completed_total"
  | "auth_login_duration_ms"
  | "auth_passkey_enrollment_total"
  | "auth_passkey_login_total"
  | "school_link_submitted_total"
  | "school_link_approved_total"
  | "school_link_rejected_total"
  | "school_link_unlinked_total"
  | "school_claim_reissued_total"
  | "school_membership_projection_total";

export interface AuthOperationalMetrics {
  increment(name: AuthMetricName, labels?: Record<string, string>): void;
  observe(
    name: AuthMetricName,
    value: number,
    labels?: Record<string, string>,
  ): void;
}

type MetricEvent = {
  type: "operational_metric";
  metric: AuthMetricName;
  value: number;
  labels: Record<string, string>;
  timestamp: string;
};

const allowedLabels: Record<
  AuthMetricName,
  Record<string, ReadonlySet<string>>
> = {
  auth_otp_started_total: {
    channel: new Set(["TELEGRAM", "SMS", "TEST", "UNKNOWN"]),
    purpose: new Set(["SIGN_IN"]),
  },
  auth_otp_delivered_total: {
    channel: new Set(["TELEGRAM", "SMS", "TEST", "UNKNOWN"]),
  },
  auth_otp_verified_total: {
    channel: new Set(["TELEGRAM", "SMS", "TEST", "UNKNOWN"]),
  },
  auth_otp_failed_total: {
    channel: new Set(["TELEGRAM", "SMS", "TEST", "UNKNOWN"]),
    reason: new Set([
      "OTP_RATE_LIMITED",
      "OTP_RESEND_TOO_SOON",
      "OTP_CHANNEL_UNAVAILABLE",
      "OTP_PROVIDER_BUDGET_EXCEEDED",
      "OTP_DELIVERY_FAILED",
      "OTP_INVALID",
      "OTP_ATTEMPTS_EXHAUSTED",
      "OTP_CODE_MISMATCH",
      "TELEGRAM_CODE_INVALID",
      "OTP_ALREADY_USED",
      "OTHER",
    ]),
  },
  auth_otp_fallback_total: {
    from: new Set(["TELEGRAM", "SMS", "UNKNOWN"]),
    to: new Set(["TELEGRAM", "SMS", "UNKNOWN"]),
  },
  auth_login_completed_total: {
    method: new Set(["PHONE_OTP", "TELEGRAM_OIDC", "PASSKEY"]),
    new_or_returning: new Set(["NEW", "RETURNING"]),
  },
  auth_login_duration_ms: {
    method: new Set(["PHONE_OTP", "TELEGRAM_OIDC", "PASSKEY"]),
  },
  auth_passkey_enrollment_total: {
    result: new Set(["SUCCESS", "FAILURE"]),
  },
  auth_passkey_login_total: {
    result: new Set(["SUCCESS", "FAILURE", "REUSE_DETECTED"]),
  },
  school_link_submitted_total: {},
  school_link_approved_total: {},
  school_link_rejected_total: {
    reason_code: new Set(["UNSPECIFIED"]),
  },
  school_link_unlinked_total: {
    reason_code: new Set(["UNSPECIFIED"]),
  },
  school_claim_reissued_total: {},
  school_membership_projection_total: {
    result: new Set([
      "MATCH",
      "MATCH_UNLINKED",
      "MATCH_INACTIVE",
      "MISSING_MEMBERSHIP",
      "MISSING_LEGACY_PROJECTION",
      "STALE_LEGACY_LINK",
      "SCHOOL_MISMATCH",
      "ROLE_MISMATCH",
      "ROSTER_MISMATCH",
      "UNKNOWN",
    ]),
  },
};

function boundedLabels(
  name: AuthMetricName,
  input: Record<string, string> = {},
) {
  const schema = allowedLabels[name];
  const output: Record<string, string> = {};
  for (const [key, allowedValues] of Object.entries(schema)) {
    const value = input[key];
    output[key] =
      value && allowedValues.has(value)
        ? value
        : key === "reason"
          ? "OTHER"
          : key === "reason_code"
            ? "UNSPECIFIED"
            : "UNKNOWN";
  }
  return output;
}

export function createStructuredAuthMetrics(
  options: {
    enabled?: boolean;
    emit?: (event: MetricEvent) => void;
    now?: () => Date;
  } = {},
): AuthOperationalMetrics {
  const enabled =
    options.enabled ?? process.env.AUTH_STRUCTURED_METRICS_ENABLED === "true";
  const emit =
    options.emit ||
    ((event: MetricEvent) => console.log(JSON.stringify(event)));
  const now = options.now || (() => new Date());

  const record = (
    name: AuthMetricName,
    value: number,
    labels?: Record<string, string>,
  ) => {
    if (!enabled || !Number.isFinite(value) || value < 0) return;
    try {
      emit({
        type: "operational_metric",
        metric: name,
        value,
        labels: boundedLabels(name, labels),
        timestamp: now().toISOString(),
      });
    } catch {
      // Observability must never break an authentication request.
    }
  };

  return {
    increment: (name, labels) => record(name, 1, labels),
    observe: (name, value, labels) => record(name, value, labels),
  };
}
