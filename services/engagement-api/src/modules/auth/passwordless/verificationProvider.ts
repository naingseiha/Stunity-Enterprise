export type VerificationChannel = "TELEGRAM" | "SMS" | "TEST";
export type PreferredVerificationChannel = "AUTO" | "TELEGRAM" | "SMS";

export interface SendAbility {
  available: boolean;
  reasonCode?: string;
  providerRequestId?: string;
}

export interface SendVerificationInput {
  destination: string;
  code: string;
  ttlSeconds: number;
  requestId: string;
  providerRequestId?: string;
}

export interface SendReceipt {
  receiptId: string;
  acceptedAt: Date;
}

export interface VerificationChannelProvider {
  readonly channel: VerificationChannel;
  canSend(destination: string): Promise<SendAbility>;
  send(input: SendVerificationInput): Promise<SendReceipt>;
  verify?(input: { receiptId: string; code: string }): Promise<{ valid: boolean; reasonCode?: string }>;
  revoke?(receiptId: string): Promise<void>;
}

class LocalTestVerificationProvider implements VerificationChannelProvider {
  readonly channel = "TEST" as const;

  async canSend(_destination: string): Promise<SendAbility> {
    return { available: process.env.NODE_ENV !== "production" && /^\d{6}$/.test(process.env.OTP_LOCAL_TEST_CODE || "") };
  }

  async send(input: SendVerificationInput): Promise<SendReceipt> {
    if (!(await this.canSend(input.destination)).available) throw new Error("Local OTP test provider is disabled");
    // Intentionally do not print or persist the code. QA obtains it from its
    // explicitly configured non-production OTP_LOCAL_TEST_CODE value.
    return { receiptId: `local_${input.requestId}`, acceptedAt: new Date() };
  }
}

export class TelegramGatewayProvider implements VerificationChannelProvider {
  readonly channel = "TELEGRAM" as const;
  private readonly baseUrl = "https://gatewayapi.telegram.org";

  constructor(private readonly accessToken: string) {}

  private async call(method: string, body: Record<string, unknown>): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch(`${this.baseUrl}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.accessToken}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) {
        const error = new Error(result.error || `Telegram Gateway returned ${response.status}`);
        (error as any).providerError = result.error;
        throw error;
      }
      return result.result || {};
    } finally {
      clearTimeout(timeout);
    }
  }

  async canSend(destination: string): Promise<SendAbility> {
    try {
      const result = await this.call("checkSendAbility", { phone_number: destination });
      return { available: typeof result.request_id === "string", providerRequestId: result.request_id };
    } catch (error: any) {
      return { available: false, reasonCode: error.providerError || "TELEGRAM_UNAVAILABLE" };
    }
  }

  async send(input: SendVerificationInput): Promise<SendReceipt> {
    const result = await this.call("sendVerificationMessage", {
      phone_number: input.destination,
      request_id: input.providerRequestId,
      code: input.code,
      ttl: Math.min(3600, Math.max(30, input.ttlSeconds)),
      payload: input.requestId.slice(0, 128),
      ...(process.env.TELEGRAM_GATEWAY_SENDER_USERNAME
        ? { sender_username: process.env.TELEGRAM_GATEWAY_SENDER_USERNAME }
        : {}),
      ...(process.env.TELEGRAM_GATEWAY_CALLBACK_URL
        ? { callback_url: process.env.TELEGRAM_GATEWAY_CALLBACK_URL }
        : {}),
    });
    if (typeof result.request_id !== "string") throw new Error("Telegram Gateway did not return a request id");
    return { receiptId: result.request_id, acceptedAt: new Date() };
  }

  async verify(input: { receiptId: string; code: string }): Promise<{ valid: boolean; reasonCode?: string }> {
    try {
      const result = await this.call("checkVerificationStatus", { request_id: input.receiptId, code: input.code });
      const status = result.verification_status?.status;
      return { valid: status === "code_valid", reasonCode: status };
    } catch (error: any) {
      return { valid: false, reasonCode: error.providerError || "TELEGRAM_VERIFY_FAILED" };
    }
  }

  async revoke(receiptId: string): Promise<void> {
    await this.call("revokeVerificationMessage", { request_id: receiptId });
  }
}

/**
 * Provider bridge adapter. The auth service owns OTP generation, hashing,
 * expiry, and abuse limits; a separately operated bridge owns vendor SDKs and
 * credentials. This keeps Telegram/SMS credentials out of the auth process and
 * lets operations switch vendors without changing auth routes.
 *
 * Bridge contract:
 * POST /can-send { destination } -> { available: boolean, reasonCode?: string }
 * POST /send { destination, code, ttlSeconds, requestId } -> { receiptId }
 */
class HttpVerificationProvider implements VerificationChannelProvider {
  constructor(
    public readonly channel: "TELEGRAM" | "SMS",
    private readonly baseUrl: string,
    private readonly authToken?: string,
  ) {}

  private async call(path: string, body: Record<string, unknown>): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.authToken ? { authorization: `Bearer ${this.authToken}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`Verification provider returned ${response.status}`);
      return result;
    } finally {
      clearTimeout(timeout);
    }
  }

  async canSend(destination: string): Promise<SendAbility> {
    try {
      const result = await this.call("/can-send", { destination });
      return { available: result.available === true, reasonCode: result.reasonCode };
    } catch {
      return { available: false, reasonCode: "PROVIDER_UNAVAILABLE" };
    }
  }

  async send(input: SendVerificationInput): Promise<SendReceipt> {
    const result = await this.call("/send", { ...input });
    if (typeof result.receiptId !== "string" || !result.receiptId) throw new Error("Provider did not return a receipt");
    return { receiptId: result.receiptId, acceptedAt: new Date() };
  }
}

export type VerificationProviders = {
  telegram?: VerificationChannelProvider;
  sms?: VerificationChannelProvider;
  localTest?: VerificationChannelProvider;
};

export function createVerificationProviders(): VerificationProviders {
  const telegramUrl = process.env.OTP_TELEGRAM_PROVIDER_URL?.trim();
  const smsUrl = process.env.OTP_SMS_PROVIDER_URL?.trim();
  const providerToken = process.env.OTP_PROVIDER_BRIDGE_TOKEN?.trim();
  const telegramToken = process.env.TELEGRAM_GATEWAY_ACCESS_TOKEN?.trim();
  return {
    telegram: telegramToken
      ? new TelegramGatewayProvider(telegramToken)
      : telegramUrl
        ? new HttpVerificationProvider("TELEGRAM", telegramUrl, providerToken)
        : undefined,
    sms: smsUrl ? new HttpVerificationProvider("SMS", smsUrl, providerToken) : undefined,
    localTest: new LocalTestVerificationProvider(),
  };
}

export async function selectVerificationProvider(
  providers: VerificationProviders,
  destination: string,
  preferred: PreferredVerificationChannel,
): Promise<{ provider: VerificationChannelProvider; smsFallbackAvailable: boolean; providerRequestId?: string }> {
  const telegramAbility = providers.telegram ? await providers.telegram.canSend(destination) : { available: false };
  const smsAbility = providers.sms ? await providers.sms.canSend(destination) : { available: false };

  if (preferred === "TELEGRAM" && telegramAbility.available && providers.telegram) {
    return { provider: providers.telegram, smsFallbackAvailable: smsAbility.available, providerRequestId: telegramAbility.providerRequestId };
  }
  if (preferred === "SMS" && smsAbility.available && providers.sms) {
    return { provider: providers.sms, smsFallbackAvailable: false };
  }
  if (preferred === "AUTO" && telegramAbility.available && providers.telegram) {
    return { provider: providers.telegram, smsFallbackAvailable: smsAbility.available, providerRequestId: telegramAbility.providerRequestId };
  }
  if (preferred === "AUTO" && smsAbility.available && providers.sms) {
    return { provider: providers.sms, smsFallbackAvailable: false };
  }

  if (preferred === "AUTO" && providers.localTest && (await providers.localTest.canSend(destination)).available) {
    return { provider: providers.localTest, smsFallbackAvailable: false };
  }
  throw Object.assign(new Error("No verification delivery channel is currently available"), {
    code: "OTP_CHANNEL_UNAVAILABLE",
  });
}
