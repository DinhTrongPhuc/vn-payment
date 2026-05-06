import crypto from "node:crypto";
import {
  IPaymentProvider,
  CreateOrderInput,
  CreateOrderResult,
  VerifyWebhookInput,
  VerifyWebhookResult,
  RefundInput,
  RefundResult,
  QueryTransactionInput,
  QueryTransactionResult,
} from "@vn-payment/core";
import {
  InvalidInputError,
  InvalidSignatureError,
  ProviderError,
} from "@vn-payment/core";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

export interface MomoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  /** Default: "production". Use "sandbox" for testing. */
  env?: "production" | "sandbox";
}

const ENDPOINTS = {
  production: "https://payment.momo.vn/v2/gateway/api",
  sandbox: "https://test-payment.momo.vn/v2/gateway/api",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Adapter
// ─────────────────────────────────────────────────────────────────────────────

export class MomoAdapter implements IPaymentProvider {
  readonly provider = "momo" as const;

  private readonly config: Required<MomoConfig>;
  private readonly baseUrl: string;

  constructor(config: MomoConfig) {
    if (!config.partnerCode || !config.accessKey || !config.secretKey) {
      throw new InvalidInputError(
        "MoMo requires partnerCode, accessKey, and secretKey."
      );
    }
    this.config = { env: "production", ...config };
    this.baseUrl = ENDPOINTS[this.config.env];
  }

  // ───────────────────────────────────────────────────────────────────────────
  // createOrder
  // ───────────────────────────────────────────────────────────────────────────

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    if (input.amount <= 0) {
      throw new InvalidInputError("amount must be greater than 0.");
    }

    const requestId = `${input.orderId}_${Date.now()}`;
    const requestType = "payWithMethod";

    const rawSignature = [
      `accessKey=${this.config.accessKey}`,
      `amount=${input.amount}`,
      `extraData=${input.extraData ?? ""}`,
      `ipnUrl=${input.ipnUrl}`,
      `orderId=${input.orderId}`,
      `orderInfo=${input.description}`,
      `partnerCode=${this.config.partnerCode}`,
      `redirectUrl=${input.redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`,
    ].join("&");

    const signature = this.sign(rawSignature);

    const body = {
      partnerCode: this.config.partnerCode,
      accessKey: this.config.accessKey,
      requestId,
      amount: input.amount,
      orderId: input.orderId,
      orderInfo: input.description,
      redirectUrl: input.redirectUrl,
      ipnUrl: input.ipnUrl,
      extraData: input.extraData ?? "",
      requestType,
      signature,
      lang: "vi",
    };

    const response = await this.post("/create", body);

    if (response.resultCode !== 0) {
      throw new ProviderError(
        "momo",
        `createOrder failed: ${response.message} (code: ${response.resultCode})`
      );
    }

    return {
      paymentUrl: response.payUrl as string,
      transactionRef: requestId,
      raw: response,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // verifyWebhook
  // ───────────────────────────────────────────────────────────────────────────

  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult> {
    const body = input.rawBody as Record<string, string | number>;

    const rawSignature = [
      `accessKey=${this.config.accessKey}`,
      `amount=${body.amount}`,
      `extraData=${body.extraData ?? ""}`,
      `message=${body.message}`,
      `orderId=${body.orderId}`,
      `orderInfo=${body.orderInfo}`,
      `orderType=${body.orderType}`,
      `partnerCode=${body.partnerCode}`,
      `payType=${body.payType}`,
      `requestId=${body.requestId}`,
      `responseTime=${body.responseTime}`,
      `resultCode=${body.resultCode}`,
      `transId=${body.transId}`,
    ].join("&");

    const expectedSignature = this.sign(rawSignature);

    if (expectedSignature !== body.signature) {
      throw new InvalidSignatureError("momo");
    }

    const resultCode = Number(body.resultCode);

    return {
      isValid: true,
      status: resultCode === 0 ? "success" : "failed",
      orderId: String(body.orderId),
      transactionId: String(body.transId),
      amount: Number(body.amount),
      message: String(body.message),
      raw: input.rawBody,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // refund
  // ───────────────────────────────────────────────────────────────────────────

  async refund(input: RefundInput): Promise<RefundResult> {
    const requestId = `refund_${input.orderId}_${Date.now()}`;

    const rawSignature = [
      `accessKey=${this.config.accessKey}`,
      `amount=${input.amount}`,
      `description=${input.reason ?? ""}`,
      `orderId=${input.orderId}`,
      `partnerCode=${this.config.partnerCode}`,
      `requestId=${requestId}`,
      `transId=${input.transactionId}`,
    ].join("&");

    const signature = this.sign(rawSignature);

    const body = {
      partnerCode: this.config.partnerCode,
      orderId: input.orderId,
      requestId,
      amount: input.amount,
      transId: input.transactionId,
      lang: "vi",
      description: input.reason ?? "",
      signature,
    };

    const response = await this.post("/refund", body);

    return {
      success: response.resultCode === 0,
      refundId: response.momoResponseId as string | undefined,
      message: String(response.message),
      raw: response,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // queryTransaction
  // ───────────────────────────────────────────────────────────────────────────

  async queryTransaction(
    input: QueryTransactionInput
  ): Promise<QueryTransactionResult> {
    const requestId = `query_${input.orderId}_${Date.now()}`;

    const rawSignature = [
      `accessKey=${this.config.accessKey}`,
      `orderId=${input.orderId}`,
      `partnerCode=${this.config.partnerCode}`,
      `requestId=${requestId}`,
    ].join("&");

    const signature = this.sign(rawSignature);

    const body = {
      partnerCode: this.config.partnerCode,
      requestId,
      orderId: input.orderId,
      signature,
      lang: "vi",
    };

    const response = await this.post("/query", body);
    const resultCode = Number(response.resultCode);

    return {
      status: resultCode === 0 ? "success" : "failed",
      orderId: String(response.orderId ?? input.orderId),
      transactionId: String(response.transId ?? ""),
      amount: Number(response.amount ?? 0),
      paidAt: response.responseTime
        ? new Date(Number(response.responseTime))
        : undefined,
      raw: response,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ───────────────────────────────────────────────────────────────────────────

  private sign(data: string): string {
    return crypto
      .createHmac("sha256", this.config.secretKey)
      .update(data)
      .digest("hex");
  }

  private async post(
    path: string,
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const url = `${this.baseUrl}${path}`;
    let response: Response;

    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new ProviderError("momo", "Network request failed.", err);
    }

    if (!response.ok) {
      throw new ProviderError(
        "momo",
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<Record<string, unknown>>;
  }
}
