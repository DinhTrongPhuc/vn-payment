import crypto from "node:crypto";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ZalopayAdapter } from "./zalopay.adapter.js";
import { InvalidSignatureError, InvalidInputError, ProviderError } from "@vn-payment/core";

const CONFIG = {
  appId: "APP123",
  key1: "KEY1_SECRET",
  key2: "KEY2_SECRET",
  env: "sandbox" as const,
};

function sign(data: string, key: string): string {
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

describe("ZalopayAdapter", () => {
  let adapter: ZalopayAdapter;

  beforeEach(() => {
    adapter = new ZalopayAdapter(CONFIG);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("throws InvalidInputError when config is missing", () => {
      expect(() => new ZalopayAdapter({ ...CONFIG, appId: "" })).toThrow(InvalidInputError);
      expect(() => new ZalopayAdapter({ ...CONFIG, key1: "" })).toThrow(InvalidInputError);
      expect(() => new ZalopayAdapter({ ...CONFIG, key2: "" })).toThrow(InvalidInputError);
    });
  });

  describe("createOrder", () => {
    it("returns paymentUrl on success", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          return_code: 1,
          return_message: "Success",
          order_url: "https://sandbox.zalopay.vn/pay/123",
          zp_trans_token: "TOKEN123",
        }),
      }));

      const result = await adapter.createOrder({
        orderId: "ORDER_001",
        amount: 50000,
        description: "Test ZaloPay",
        redirectUrl: "https://example.com/return",
        ipnUrl: "https://example.com/ipn",
      });

      expect(result.paymentUrl).toBe("https://sandbox.zalopay.vn/pay/123");
      expect(result.transactionRef).toContain("ORDER_001");
    });

    it("throws ProviderError on non-1 return_code", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          return_code: 2,
          return_message: "Failed",
        }),
      }));

      await expect(adapter.createOrder({
        orderId: "ORDER_001",
        amount: 50000,
        description: "Test",
        redirectUrl: "https://example.com",
        ipnUrl: "https://example.com",
      })).rejects.toThrow(ProviderError);
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
      const parsedData = {
        app_id: 123,
        app_trans_id: "230506_ORDER_001_1234567890",
        app_time: 1234567890,
        app_user: "user_ORDER_001",
        amount: 50000,
        embed_data: "{}",
        item: "[]",
        zp_trans_id: 987654321,
        server_time: 1234567890,
        channel: 38,
        merchant_user_id: "user",
        mac: "fake_mac"
      };

      const dataStr = JSON.stringify(parsedData);
      const mac = sign(dataStr, CONFIG.key2);

      const rawBody = {
        data: dataStr,
        mac: mac,
      };

      const result = await adapter.verifyWebhook({ rawBody });
      expect(result.isValid).toBe(true);
      expect(result.orderId).toBe("ORDER_001");
      expect(result.amount).toBe(50000);
      expect(result.transactionId).toBe("987654321");
    });

    it("throws InvalidSignatureError when tampered", async () => {
      const dataStr = JSON.stringify({ amount: 50000 });
      const rawBody = {
        data: dataStr,
        mac: "invalid_mac",
      };

      await expect(adapter.verifyWebhook({ rawBody })).rejects.toThrow(InvalidSignatureError);
    });
  });

  describe("refund", () => {
    it("returns success on valid refund", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          return_code: 1,
          return_message: "Refund Success",
          refund_id: "REFUND_123",
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
          return_code: 1,
          return_message: "Success",
          zp_trans_id: "TXN_123",
          amount: 50000,
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
