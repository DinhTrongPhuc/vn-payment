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
  InvalidInputError,
  InvalidSignatureError,
  ProviderError,
} from "@vn-payment/core";

export interface ZalopayConfig {
  appId: string;
  key1: string;
  key2: string;
  /** Default: "production". Use "sandbox" for testing. */
  env?: "production" | "sandbox";
}

const ENDPOINTS = {
  production: "https://openapi.zalopay.vn/v2",
  sandbox: "https://sb-openapi.zalopay.vn/v2",
} as const;

export class ZalopayAdapter implements IPaymentProvider {
  readonly provider = "zalopay" as const;
  private readonly config: Required<ZalopayConfig>;
  private readonly baseUrl: string;

  constructor(config: ZalopayConfig) {
    if (!config.appId || !config.key1 || !config.key2) {
      throw new InvalidInputError("ZaloPay requires appId, key1, and key2.");
    }
    this.config = { env: "production", ...config };
    this.baseUrl = ENDPOINTS[this.config.env];
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    if (input.amount <= 0) {
      throw new InvalidInputError("amount must be greater than 0.");
    }

    const appTime = Date.now();
    // app_trans_id must start with YYMMDD
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const appTransId = `${dateStr}_${input.orderId}_${appTime}`;

    const item = "[]";
    const embedData = JSON.stringify({
      redirecturl: input.redirectUrl,
    });

    const amount = input.amount;
    const description = input.description || `Thanh toán đơn hàng ${input.orderId}`;
    const bankCode = "";

    // MAC formula: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
    const rawSignature = [
      this.config.appId,
      appTransId,
      `user_${input.orderId}`,
      amount,
      appTime,
      embedData,
      item,
    ].join("|");
    
    const mac = this.sign(rawSignature, this.config.key1);

    const body = {
      app_id: this.config.appId,
      app_trans_id: appTransId,
      app_user: `user_${input.orderId}`,
      app_time: appTime,
      item,
      embed_data: embedData,
      amount,
      description,
      bank_code: bankCode,
      mac,
      callback_url: input.ipnUrl,
    };

    const response = await this.post("/create", body);

    if (response.return_code !== 1) {
      throw new ProviderError(
        "zalopay",
        `createOrder failed: ${response.return_message} (code: ${response.return_code})`
      );
    }

    return {
      paymentUrl: response.order_url as string,
      transactionRef: appTransId, // Developer should save this to query later
      raw: response,
    };
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult> {
    const rawBody = input.rawBody as any;
    
    if (!rawBody || typeof rawBody.data !== "string" || typeof rawBody.mac !== "string") {
      throw new InvalidInputError("Invalid ZaloPay webhook payload.");
    }

    const { data, mac } = rawBody;

    // MAC for webhook is HMAC-SHA256 of data with key2
    const expectedMac = this.sign(data, this.config.key2);

    if (expectedMac !== mac) {
      throw new InvalidSignatureError("zalopay");
    }

    const parsedData = JSON.parse(data);

    // Extract original orderId from app_trans_id (format: YYMMDD_orderId_timestamp)
    const parts = parsedData.app_trans_id ? String(parsedData.app_trans_id).split("_") : [];
    // If we built it as YYMMDD_orderId_appTime, orderId is everything between first and last underscore
    const orderId = parts.length > 2 ? parts.slice(1, -1).join("_") : String(parsedData.app_trans_id);

    return {
      isValid: true,
      status: "success", // ZaloPay webhook data means successful payment
      orderId,
      transactionId: String(parsedData.zp_trans_id),
      amount: Number(parsedData.amount),
      message: "Webhook verified successfully",
      raw: input.rawBody,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const timestamp = Date.now();
    const uid = `${timestamp}${Math.floor(111 + Math.random() * 888)}`;
    const mRefundId = `${new Date().toISOString().slice(2, 10).replace(/-/g, "")}_${this.config.appId}_${uid}`;

    const description = input.reason || `Hoàn tiền cho đơn hàng ${input.orderId}`;
    
    // MAC formula: app_id|zp_trans_id|amount|description|timestamp
    const rawSignature = [
      this.config.appId,
      input.transactionId, // Need ZaloPay's transaction ID
      input.amount,
      description,
      timestamp,
    ].join("|");
    
    const mac = this.sign(rawSignature, this.config.key1);

    const body = {
      app_id: this.config.appId,
      m_refund_id: mRefundId,
      zp_trans_id: input.transactionId,
      amount: input.amount,
      timestamp,
      description,
      mac,
    };

    const response = await this.post("/refund", body);

    return {
      success: response.return_code === 1,
      refundId: response.refund_id as string | undefined,
      message: String(response.return_message),
      raw: response,
    };
  }

  async queryTransaction(input: QueryTransactionInput): Promise<QueryTransactionResult> {
    // We expect input.transactionId to be the app_trans_id we returned in createOrder
    const appTransId = input.transactionId || input.orderId;
    
    // MAC formula: app_id|app_trans_id|key1
    const rawSignature = [
      this.config.appId,
      appTransId,
      this.config.key1,
    ].join("|");
    
    const mac = this.sign(rawSignature, this.config.key1);

    const body = {
      app_id: this.config.appId,
      app_trans_id: appTransId,
      mac,
    };

    const response = await this.post("/query", body);
    const isSuccess = response.return_code === 1;

    return {
      status: isSuccess ? "success" : "failed",
      orderId: input.orderId,
      transactionId: String(response.zp_trans_id || ""),
      amount: Number(response.amount || 0),
      paidAt: response.server_time ? new Date(Number(response.server_time)) : undefined,
      raw: response,
    };
  }

  private sign(data: string, key: string): string {
    return crypto.createHmac("sha256", key).update(data).digest("hex");
  }

  private async post(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const url = `${this.baseUrl}${path}`;
    let response: Response;

    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new ProviderError("zalopay", "Network request failed.", err);
    }

    if (!response.ok) {
      throw new ProviderError("zalopay", `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<Record<string, unknown>>;
  }
}
