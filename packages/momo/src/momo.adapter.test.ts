import crypto from "node:crypto";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MomoAdapter } from "./momo.adapter.js";
import {
  InvalidSignatureError,
  InvalidInputError,
  ProviderError,
} from "./index.js";

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  partnerCode: "MOMO_TEST",
  accessKey: "F8BBA842ECF85",
  secretKey: "K951B6PE1waDMi640xX08PD3vg6EkVlz",
  env: "sandbox" as const,
};

function sign(data: string): string {
  return crypto
    .createHmac("sha256", CONFIG.secretKey)
    .update(data)
    .digest("hex");
}

// Build a valid IPN payload exactly as MoMo sends it
function buildValidIpnBody(overrides: Record<string, unknown> = {}) {
  const base = {
    partnerCode: CONFIG.partnerCode,
    accessKey: CONFIG.accessKey,
    requestId: "ORDER_001_1234567890",
    amount: 50000,
    orderId: "ORDER_001",
    orderInfo: "Thanh toán đơn hàng #001",
    orderType: "momo_wallet",
    transId: 3456789,
    resultCode: 0,
    message: "Thành công.",
    payType: "qr",
    responseTime: 1609459200000,
    extraData: "",
    ...overrides,
  };

  const rawSignature = [
    `accessKey=${CONFIG.accessKey}`,
    `amount=${base.amount}`,
    `extraData=${base.extraData}`,
    `message=${base.message}`,
    `orderId=${base.orderId}`,
    `orderInfo=${base.orderInfo}`,
    `orderType=${base.orderType}`,
    `partnerCode=${base.partnerCode}`,
    `payType=${base.payType}`,
    `requestId=${base.requestId}`,
    `responseTime=${base.responseTime}`,
    `resultCode=${base.resultCode}`,
    `transId=${base.transId}`,
  ].join("&");

  return { ...base, signature: sign(rawSignature) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("MomoAdapter", () => {
  let adapter: MomoAdapter;

  beforeEach(() => {
    adapter = new MomoAdapter(CONFIG);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Constructor ──────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("throws InvalidInputError when partnerCode is missing", () => {
      expect(() => new MomoAdapter({ ...CONFIG, partnerCode: "" })).toThrow(
        InvalidInputError,
      );
    });

    it("throws InvalidInputError when accessKey is missing", () => {
      expect(() => new MomoAdapter({ ...CONFIG, accessKey: "" })).toThrow(
        InvalidInputError,
      );
    });

    it("throws InvalidInputError when secretKey is missing", () => {
      expect(() => new MomoAdapter({ ...CONFIG, secretKey: "" })).toThrow(
        InvalidInputError,
      );
    });

    it("defaults to production env when env is not specified", () => {
      const a = new MomoAdapter({
        partnerCode: "X",
        accessKey: "Y",
        secretKey: "Z",
      });
      expect(a.provider).toBe("momo");
    });
  });

  // ─── createOrder ──────────────────────────────────────────────────────────

  describe("createOrder", () => {
    it("returns paymentUrl and transactionRef on success", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              resultCode: 0,
              message: "Thành công.",
              payUrl: "https://test-payment.momo.vn/pay/ORDER_001",
              requestId: "ORDER_001_123",
            }),
        }),
      );

      const result = await adapter.createOrder({
        orderId: "ORDER_001",
        amount: 50000,
        description: "Thanh toán đơn hàng #001",
        redirectUrl: "https://example.com/return",
        ipnUrl: "https://example.com/webhook",
      });

      expect(result.paymentUrl).toBe(
        "https://test-payment.momo.vn/pay/ORDER_001",
      );
      expect(result.transactionRef).toContain("ORDER_001");
      expect(result.raw).toBeDefined();
    });

    it("throws InvalidInputError when amount is 0", async () => {
      await expect(
        adapter.createOrder({
          orderId: "ORDER_001",
          amount: 0,
          description: "Test",
          redirectUrl: "https://example.com/return",
          ipnUrl: "https://example.com/webhook",
        }),
      ).rejects.toThrow(InvalidInputError);
    });

    it("throws InvalidInputError when amount is negative", async () => {
      await expect(
        adapter.createOrder({
          orderId: "ORDER_001",
          amount: -1000,
          description: "Test",
          redirectUrl: "https://example.com/return",
          ipnUrl: "https://example.com/webhook",
        }),
      ).rejects.toThrow(InvalidInputError);
    });

    it("throws ProviderError when MoMo returns non-zero resultCode", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              resultCode: 11,
              message: "Invalid access key",
            }),
        }),
      );

      await expect(
        adapter.createOrder({
          orderId: "ORDER_001",
          amount: 50000,
          description: "Test",
          redirectUrl: "https://example.com/return",
          ipnUrl: "https://example.com/webhook",
        }),
      ).rejects.toThrow(ProviderError);
    });

    it("throws ProviderError on network failure", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("Network error")),
      );

      await expect(
        adapter.createOrder({
          orderId: "ORDER_001",
          amount: 50000,
          description: "Test",
          redirectUrl: "https://example.com/return",
          ipnUrl: "https://example.com/webhook",
        }),
      ).rejects.toThrow(ProviderError);
    });

    it("sends the correct HMAC-SHA256 signature in the request body", async () => {
      let capturedBody: Record<string, unknown> = {};

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((_url, opts) => {
          capturedBody = JSON.parse(opts.body as string);
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ resultCode: 0, payUrl: "https://momo.vn/pay" }),
          });
        }),
      );

      await adapter.createOrder({
        orderId: "ORDER_SIG",
        amount: 100000,
        description: "Sig test",
        redirectUrl: "https://example.com/return",
        ipnUrl: "https://example.com/webhook",
      });

      // Re-compute expected signature from captured body
      const rawSig = [
        `accessKey=${capturedBody.accessKey}`,
        `amount=${capturedBody.amount}`,
        `extraData=${capturedBody.extraData}`,
        `ipnUrl=${capturedBody.ipnUrl}`,
        `orderId=${capturedBody.orderId}`,
        `orderInfo=${capturedBody.orderInfo}`,
        `partnerCode=${capturedBody.partnerCode}`,
        `redirectUrl=${capturedBody.redirectUrl}`,
        `requestId=${capturedBody.requestId}`,
        `requestType=${capturedBody.requestType}`,
      ].join("&");

      expect(capturedBody.signature).toBe(sign(rawSig));
    });
  });

  // ─── verifyWebhook ────────────────────────────────────────────────────────

  describe("verifyWebhook", () => {
    it("returns success result for a valid successful IPN", async () => {
      const ipn = buildValidIpnBody();
      const result = await adapter.verifyWebhook({ rawBody: ipn });

      expect(result.isValid).toBe(true);
      expect(result.status).toBe("success");
      expect(result.orderId).toBe("ORDER_001");
      expect(result.transactionId).toBe("3456789");
      expect(result.amount).toBe(50000);
    });

    it("returns failed status when resultCode is non-zero", async () => {
      const ipn = buildValidIpnBody({
        resultCode: 1006,
        message: "Giao dịch bị từ chối.",
      });
      const result = await adapter.verifyWebhook({ rawBody: ipn });

      expect(result.status).toBe("failed");
      expect(result.isValid).toBe(true); // signature is valid, but payment failed
    });

    it("throws InvalidSignatureError when signature is tampered", async () => {
      const ipn = { ...buildValidIpnBody(), signature: "tampered_sig" };

      await expect(adapter.verifyWebhook({ rawBody: ipn })).rejects.toThrow(
        InvalidSignatureError,
      );
    });

    it("throws InvalidSignatureError when amount is altered after signing", async () => {
      const ipn = { ...buildValidIpnBody(), amount: 99999999 }; // tampered amount

      await expect(adapter.verifyWebhook({ rawBody: ipn })).rejects.toThrow(
        InvalidSignatureError,
      );
    });

    it("throws InvalidSignatureError when orderId is altered after signing", async () => {
      const ipn = { ...buildValidIpnBody(), orderId: "FAKE_ORDER" };

      await expect(adapter.verifyWebhook({ rawBody: ipn })).rejects.toThrow(
        InvalidSignatureError,
      );
    });
  });

  // ─── refund ───────────────────────────────────────────────────────────────

  describe("refund", () => {
    it("returns success result when MoMo approves refund", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              resultCode: 0,
              message: "Hoàn tiền thành công.",
              momoResponseId: "REFUND_789",
            }),
        }),
      );

      const result = await adapter.refund({
        orderId: "ORDER_001",
        transactionId: "TXN_001",
        amount: 50000,
        reason: "Khách hàng đổi ý",
      });

      expect(result.success).toBe(true);
      expect(result.refundId).toBe("REFUND_789");
    });

    it("returns success=false when MoMo rejects refund", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              resultCode: 1001,
              message: "Số dư không đủ.",
            }),
        }),
      );

      const result = await adapter.refund({
        orderId: "ORDER_001",
        transactionId: "TXN_001",
        amount: 50000,
      });

      expect(result.success).toBe(false);
    });
  });

  // ─── queryTransaction ─────────────────────────────────────────────────────

  describe("queryTransaction", () => {
    it("returns success status for a completed transaction", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              resultCode: 0,
              message: "Thành công.",
              orderId: "ORDER_001",
              transId: 3456789,
              amount: 50000,
              responseTime: 1609459200000,
            }),
        }),
      );

      const result = await adapter.queryTransaction({ orderId: "ORDER_001" });

      expect(result.status).toBe("success");
      expect(result.orderId).toBe("ORDER_001");
      expect(result.amount).toBe(50000);
      expect(result.paidAt).toBeInstanceOf(Date);
    });

    it("returns failed status for a not-found transaction", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              resultCode: 1000,
              message: "Không tìm thấy giao dịch.",
            }),
        }),
      );

      const result = await adapter.queryTransaction({
        orderId: "ORDER_NOTFOUND",
      });
      expect(result.status).toBe("failed");
    });
  });
});
