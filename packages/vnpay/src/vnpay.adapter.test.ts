import crypto from "node:crypto";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VnpayAdapter } from "./vnpay.adapter.js";
import { InvalidSignatureError, InvalidInputError, ProviderError } from "@vn-payment/core";

const CONFIG = {
  tmnCode: "TMN123",
  secureSecret: "SECRET_KEY",
  env: "sandbox" as const,
};

function sign(data: string, secret: string): string {
  return crypto.createHmac("sha512", secret).update(Buffer.from(data, "utf-8")).digest("hex");
}

describe("VnpayAdapter", () => {
  let adapter: VnpayAdapter;

  beforeEach(() => {
    adapter = new VnpayAdapter(CONFIG);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("throws InvalidInputError when config is missing", () => {
      expect(() => new VnpayAdapter({ ...CONFIG, tmnCode: "" })).toThrow(InvalidInputError);
      expect(() => new VnpayAdapter({ ...CONFIG, secureSecret: "" })).toThrow(InvalidInputError);
    });
  });

  describe("createOrder", () => {
    it("returns a formatted paymentUrl", async () => {
      const result = await adapter.createOrder({
        orderId: "ORDER_001",
        amount: 50000,
        description: "Test VNPay",
        redirectUrl: "https://example.com/return",
        ipnUrl: "https://example.com/ipn",
      });

      expect(result.paymentUrl).toContain("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html");
      expect(result.paymentUrl).toContain("vnp_Amount=5000000"); // 50000 * 100
      expect(result.paymentUrl).toContain("vnp_TxnRef=ORDER_001");
      expect(result.paymentUrl).toContain("vnp_SecureHash=");
      expect(result.transactionRef).toBe("ORDER_001");
    });

    it("throws InvalidInputError when amount <= 0", async () => {
      await expect(adapter.createOrder({
        orderId: "ORDER_001",
        amount: 0,
        description: "Test",
        redirectUrl: "https://example.com",
        ipnUrl: "https://example.com",
      })).rejects.toThrow(InvalidInputError);
    });
  });

  describe("verifyWebhook", () => {
    it("verifies a valid webhook payload", async () => {
      const payload: Record<string, string | number> = {
        vnp_Amount: 5000000,
        vnp_BankCode: "NCB",
        vnp_BankTranNo: "VNP123456",
        vnp_CardType: "ATM",
        vnp_OrderInfo: "Test",
        vnp_PayDate: "20230506123456",
        vnp_ResponseCode: "00",
        vnp_TmnCode: CONFIG.tmnCode,
        vnp_TransactionNo: "13579",
        vnp_TransactionStatus: "00",
        vnp_TxnRef: "ORDER_001",
      };

      // Build expected hash manually
      const sortedKeys = Object.keys(payload).sort();
      const parts = [];
      for (const key of sortedKeys) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(payload[key])).replace(/%20/g, '+')}`);
      }
      const rawHash = parts.join("&");
      const secureHash = sign(rawHash, CONFIG.secureSecret);

      const rawBody = { ...payload, vnp_SecureHash: secureHash };

      const result = await adapter.verifyWebhook({ rawBody });
      expect(result.isValid).toBe(true);
      expect(result.status).toBe("success");
      expect(result.orderId).toBe("ORDER_001");
      expect(result.amount).toBe(50000); // Converted back from 5000000
    });

    it("throws InvalidSignatureError when tampered", async () => {
      const payload: Record<string, string | number> = {
        vnp_Amount: 5000000,
        vnp_ResponseCode: "00",
        vnp_TxnRef: "ORDER_001",
        vnp_SecureHash: "tampered_hash",
      };

      await expect(adapter.verifyWebhook({ rawBody: payload })).rejects.toThrow(InvalidSignatureError);
    });
  });

  describe("refund", () => {
    it("returns success on valid refund", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          vnp_ResponseCode: "00",
          vnp_Message: "Refund Success",
          vnp_TransactionNo: "REFUND_123",
        }),
      }));

      const result = await adapter.refund({
        orderId: "ORDER_001",
        transactionId: "TXN_123",
        amount: 50000,
      });

      expect(result.success).toBe(true);
      expect(result.refundId).toBe("REFUND_123");
    });
  });

  describe("queryTransaction", () => {
    it("returns success on valid query", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          vnp_ResponseCode: "00",
          vnp_TransactionStatus: "00",
          vnp_TransactionNo: "TXN_123",
          vnp_Amount: 5000000,
          vnp_TxnRef: "ORDER_001",
        }),
      }));

      const result = await adapter.queryTransaction({
        orderId: "ORDER_001",
      });

      expect(result.status).toBe("success");
      expect(result.amount).toBe(50000);
      expect(result.transactionId).toBe("TXN_123");
    });
  });
});
