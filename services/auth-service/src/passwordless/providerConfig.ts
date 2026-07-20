export type PasswordlessConfig = {
  enabled: boolean;
  production: boolean;
  hmacConfigured: boolean;
  redisConfigured: boolean;
  telegramMode: "DIRECT" | "BRIDGE" | "NONE";
  smsMode: "BRIDGE" | "NONE";
  localTestConfigured: boolean;
  structuredMetricsEnabled: boolean;
  errors: string[];
  warnings: string[];
};

export type PasswordlessReadiness = {
  ready: boolean;
  status: "disabled" | "ready" | "not_ready";
  sharedState: boolean;
  hmac: boolean;
  observability: boolean;
  providers: {
    telegram: "DIRECT" | "BRIDGE" | "NONE";
    sms: "BRIDGE" | "NONE";
    localTest: boolean;
  };
  errors: string[];
  warnings: string[];
};

type Env = Record<string, string | undefined>;

/**
 * Readiness checks are intentionally pure so CI/staging can validate config
 * without contacting Telegram, an SMS vendor, Redis, or the database.
 */
export function readPasswordlessConfig(env: Env = process.env): PasswordlessConfig {
  const enabled = env.PASSWORDLESS_AUTH_ENABLED === "true";
  const production = env.NODE_ENV === "production";
  const hmacConfigured = Boolean(env.OTP_HMAC_SECRET && env.OTP_HMAC_SECRET.length >= 32);
  const redisConfigured = Boolean(env.AUTH_RATE_LIMIT_REDIS_URL?.trim() || env.REDIS_URL?.trim());
  const telegramMode = env.TELEGRAM_GATEWAY_ACCESS_TOKEN?.trim()
    ? "DIRECT"
    : env.OTP_TELEGRAM_PROVIDER_URL?.trim()
      ? "BRIDGE"
      : "NONE";
  const smsMode = env.OTP_SMS_PROVIDER_URL?.trim() ? "BRIDGE" : "NONE";
  const localTestConfigured = !production && /^\d{6}$/.test(env.OTP_LOCAL_TEST_CODE || "");
  const structuredMetricsEnabled = env.AUTH_STRUCTURED_METRICS_ENABLED === "true";

  const errors: string[] = [];
  const warnings: string[] = [];
  if (enabled && production) {
    if (!hmacConfigured) errors.push("OTP_HMAC_SECRET must contain at least 32 characters.");
    if (!redisConfigured) errors.push("REDIS_URL or AUTH_RATE_LIMIT_REDIS_URL is required for shared OTP state.");
    if (telegramMode === "NONE" && smsMode === "NONE") {
      errors.push("At least one Telegram or SMS provider must be configured.");
    }
    if (telegramMode !== "NONE" && !(Number(env.OTP_DAILY_TELEGRAM_LIMIT) > 0)) {
      errors.push("OTP_DAILY_TELEGRAM_LIMIT must be a positive daily safety limit.");
    }
    if (smsMode !== "NONE" && !(Number(env.OTP_DAILY_SMS_LIMIT) > 0)) {
      errors.push("OTP_DAILY_SMS_LIMIT must be a positive daily safety limit.");
    }
    if (smsMode === "NONE") {
      warnings.push("SMS fallback is not configured; Telegram-only delivery is not suitable for broad rollout.");
    }
    if (!structuredMetricsEnabled) {
      warnings.push("AUTH_STRUCTURED_METRICS_ENABLED is false; rollout dashboards will not receive OTP metrics.");
    }
  }
  return {
    enabled,
    production,
    hmacConfigured,
    redisConfigured,
    telegramMode,
    smsMode,
    localTestConfigured,
    structuredMetricsEnabled,
    errors,
    warnings,
  };
}

export function assertPasswordlessProductionConfig(env: Env = process.env): PasswordlessConfig {
  const config = readPasswordlessConfig(env);
  if (config.enabled && config.production && config.errors.length > 0) {
    throw new Error(`FATAL: passwordless configuration is incomplete: ${config.errors.join(" ")}`);
  }
  return config;
}

export function buildPasswordlessReadiness(env: Env = process.env): PasswordlessReadiness {
  const config = readPasswordlessConfig(env);
  if (!config.enabled) {
    return {
      ready: true,
      status: "disabled",
      sharedState: config.redisConfigured,
      hmac: config.hmacConfigured,
      observability: config.structuredMetricsEnabled,
      providers: {
        telegram: config.telegramMode,
        sms: config.smsMode,
        localTest: config.localTestConfigured,
      },
      errors: [],
      warnings: config.warnings,
    };
  }

  const errors = [...config.errors];
  const hasDelivery = config.telegramMode !== "NONE" || config.smsMode !== "NONE" || config.localTestConfigured;
  if (!hasDelivery) errors.push("No passwordless delivery provider is available.");
  if (config.production && !config.redisConfigured && !errors.some((error) => error.includes("REDIS_URL"))) {
    errors.push("Shared OTP state is unavailable.");
  }
  if (config.production && !config.structuredMetricsEnabled) {
    errors.push("Structured passwordless metrics are required for rollout readiness.");
  }

  return {
    ready: errors.length === 0,
    status: errors.length === 0 ? "ready" : "not_ready",
    sharedState: config.redisConfigured,
    hmac: config.hmacConfigured,
    observability: config.structuredMetricsEnabled,
    providers: {
      telegram: config.telegramMode,
      sms: config.smsMode,
      localTest: config.localTestConfigured,
    },
    errors,
    warnings: config.warnings,
  };
}
