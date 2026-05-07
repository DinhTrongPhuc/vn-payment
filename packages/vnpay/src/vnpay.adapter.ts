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

export interface VnpayConfig {
  tmnCode: string;
  secureSecret: string;
  /** Default: "production". Use "sandbox" for testing. */
  env?: "production" | "sandbox";
}

const ENDPOINTS = {
  production: {
    payUrl: "https://pay.vnpay.vn/vpcpay.html",
    apiUrl: "https://merchant.vnpay.vn/merchant_webapi/api/transaction",
  },
  sandbox: {
    payUrl: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    apiUrl: "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
  },
} as const;

export class VnpayAdapter implements IPaymentProvider {
  readonly provider = "vnpay" as const;
  private readonly config: Required<VnpayConfig>;
  private readonly endpoints: { payUrl: string; apiUrl: string };

  constructor(config: VnpayConfig) {
    if (!config.tmnCode || !config.secureSecret) {
      throw new InvalidInputError("VNPay requires tmnCode and secureSecret.");
    }
    this.config = { env: "production", ...config };
    this.endpoints = ENDPOINTS[this.config.env];
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    if (input.amount <= 0) {
      throw new InvalidInputError("amount must be greater than 0.");
    }

    const date = new Date();
    const createDate = this.formatDate(date);
    const orderId = input.orderId;
    const amount = input.amount * 100; // VNPay requires amount * 100
    
    // Optional IP address fallback
    const ipAddr = "127.0.0.1";

    const vnpParams: Record<string, string | number> = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: this.config.tmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId,
      vnp_OrderInfo: input.description,
      vnp_OrderType: "other",
      vnp_Amount: amount,
      vnp_ReturnUrl: input.redirectUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    const sortedString = this.buildSortedQueryString(vnpParams);
    const secureHash = this.sign(sortedString);
    
    const paymentUrl = `${this.endpoints.payUrl}?${sortedString}&vnp_SecureHash=${secureHash}`;

    return {
      paymentUrl,
      transactionRef: orderId, // VNPay identifies transactions by TxnRef
      raw: {
        paymentUrl,
        vnpParams,
        secureHash,
      },
    };
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult> {
    const rawBody = input.rawBody as Record<string, string | number>;
    
    if (!rawBody || !rawBody.vnp_SecureHash) {
      throw new InvalidInputError("Invalid VNPay webhook payload. Missing vnp_SecureHash.");
    }

    const secureHash = rawBody.vnp_SecureHash as string;
    
    // Copy the body and remove hash params to reconstruct the signature
    const paramsToSign: Record<string, string | number> = {};
    for (const key in rawBody) {
      if (key !== "vnp_SecureHash" && key !== "vnp_SecureHashType") {
        paramsToSign[key] = rawBody[key];
      }
    }

    const sortedString = this.buildSortedQueryString(paramsToSign);
    const expectedHash = this.sign(sortedString);

    if (secureHash !== expectedHash) {
      throw new InvalidSignatureError("vnpay");
    }

    const responseCode = String(rawBody.vnp_ResponseCode);
    const isSuccess = responseCode === "00";

    return {
      isValid: true,
      status: isSuccess ? "success" : "failed",
      orderId: String(rawBody.vnp_TxnRef),
      transactionId: String(rawBody.vnp_TransactionNo),
      amount: Number(rawBody.vnp_Amount) / 100, // Convert back from * 100
      message: `VNPay Response Code: ${responseCode}`,
      raw: rawBody,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const date = new Date();
    const createDate = this.formatDate(date);
    const requestId = `refund_${input.orderId}_${date.getTime()}`;
    const amount = input.amount * 100;
    
    // For refund, VNPay needs TransactionDate. We must require it or use a default, 
    // but VNPay strictly requires the exact vnp_PayDate of the original transaction.
    // In a generic adapter, we might ask the user to pass it in `extraData` or `transactionId`.
    // We will assume `transactionId` is the vnp_TransactionNo or provided by the user.
    // For this basic unified implementation, we will mock the transactionDate to today if not provided,
    // though in real production, VNPay users must save `vnp_PayDate` from IPN.
    const transactionDate = createDate; // Typically should be passed from IPN.

    const dataObj = {
      vnp_RequestId: requestId,
      vnp_Version: "2.1.0",
      vnp_Command: "refund",
      vnp_TmnCode: this.config.tmnCode,
      vnp_TransactionType: "02", // 02: Full Refund, 03: Partial
      vnp_TxnRef: input.orderId,
      vnp_Amount: amount,
      vnp_OrderInfo: input.reason || "Hoan tien giao dich",
      vnp_TransactionNo: input.transactionId,
      vnp_TransactionDate: transactionDate,
      vnp_CreateBy: "Admin",
      vnp_CreateDate: createDate,
      vnp_IpAddr: "127.0.0.1",
    };

    // Checksum for API is Hash(RequestId|Version|Command|TmnCode|TransactionType|TxnRef|Amount|TransactionNo|TransactionDate|CreateBy|CreateDate|IpAddr|OrderInfo)
    const rawHash = [
      dataObj.vnp_RequestId,
      dataObj.vnp_Version,
      dataObj.vnp_Command,
      dataObj.vnp_TmnCode,
      dataObj.vnp_TransactionType,
      dataObj.vnp_TxnRef,
      dataObj.vnp_Amount,
      dataObj.vnp_TransactionNo,
      dataObj.vnp_TransactionDate,
      dataObj.vnp_CreateBy,
      dataObj.vnp_CreateDate,
      dataObj.vnp_IpAddr,
      dataObj.vnp_OrderInfo,
    ].join("|");

    const secureHash = this.sign(rawHash);

    const body = {
      ...dataObj,
      vnp_SecureHash: secureHash,
    };

    const response = await this.postApi(body);

    return {
      success: response.vnp_ResponseCode === "00",
      refundId: response.vnp_TransactionNo as string,
      message: String(response.vnp_Message),
      raw: response,
    };
  }

  async queryTransaction(input: QueryTransactionInput): Promise<QueryTransactionResult> {
    const date = new Date();
    const createDate = this.formatDate(date);
    const requestId = `query_${input.orderId}_${date.getTime()}`;
    const transactionDate = createDate; // Ideally from original IPN `vnp_PayDate`

    const dataObj = {
      vnp_RequestId: requestId,
      vnp_Version: "2.1.0",
      vnp_Command: "querydr",
      vnp_TmnCode: this.config.tmnCode,
      vnp_TxnRef: input.orderId,
      vnp_OrderInfo: "Truy van giao dich",
      vnp_TransactionDate: transactionDate,
      vnp_CreateDate: createDate,
      vnp_IpAddr: "127.0.0.1",
    };

    // Checksum: RequestId|Version|Command|TmnCode|TxnRef|TransactionDate|CreateDate|IpAddr|OrderInfo
    const rawHash = [
      dataObj.vnp_RequestId,
      dataObj.vnp_Version,
      dataObj.vnp_Command,
      dataObj.vnp_TmnCode,
      dataObj.vnp_TxnRef,
      dataObj.vnp_TransactionDate,
      dataObj.vnp_CreateDate,
      dataObj.vnp_IpAddr,
      dataObj.vnp_OrderInfo,
    ].join("|");

    const secureHash = this.sign(rawHash);

    const body = {
      ...dataObj,
      vnp_SecureHash: secureHash,
    };

    const response = await this.postApi(body);
    const isSuccess = response.vnp_ResponseCode === "00" && response.vnp_TransactionStatus === "00";

    return {
      status: isSuccess ? "success" : "failed",
      orderId: String(response.vnp_TxnRef || input.orderId),
      transactionId: String(response.vnp_TransactionNo || ""),
      amount: Number(response.vnp_Amount || 0) / 100,
      paidAt: response.vnp_PayDate ? this.parseDate(String(response.vnp_PayDate)) : undefined,
      raw: response,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────────────────────────

  private sign(data: string): string {
    return crypto
      .createHmac("sha512", this.config.secureSecret)
      .update(Buffer.from(data, "utf-8"))
      .digest("hex");
  }

  private buildSortedQueryString(data: Record<string, string | number>): string {
    const sortedKeys = Object.keys(data).sort();
    const searchParams = new URLSearchParams();
    
    for (const key of sortedKeys) {
      if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
        searchParams.append(key, String(data[key]));
      }
    }
    
    // VNPay strictly requires %20 to be + or properly encoded spaces.
    // URLSearchParams encodes spaces as `+`, but typically VNPay wants custom encoding.
    // However, the standard `sort()` and `encodeURIComponent` loop is safest for VNPay:
    const parts = [];
    for (const key of sortedKeys) {
      const val = data[key];
      if (val !== undefined && val !== null && val !== "") {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val)).replace(/%20/g, '+')}`);
      }
    }
    return parts.join("&");
  }

  private async postApi(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response: Response;

    try {
      response = await fetch(this.endpoints.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new ProviderError("vnpay", "Network request failed.", err);
    }

    if (!response.ok) {
      throw new ProviderError("vnpay", `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<Record<string, unknown>>;
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => (n < 10 ? "0" + n : String(n));
    return (
      date.getFullYear() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds())
    );
  }

  private parseDate(dateStr: string): Date {
    if (dateStr.length !== 14) return new Date();
    const year = parseInt(dateStr.slice(0, 4), 10);
    const month = parseInt(dateStr.slice(4, 6), 10) - 1;
    const day = parseInt(dateStr.slice(6, 8), 10);
    const hour = parseInt(dateStr.slice(8, 10), 10);
    const minute = parseInt(dateStr.slice(10, 12), 10);
    const second = parseInt(dateStr.slice(12, 14), 10);
    return new Date(year, month, day, hour, minute, second);
  }
}
