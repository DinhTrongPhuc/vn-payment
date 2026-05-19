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
} from "@vn-payment/core";

export interface MockAdapterConfig {
  /** Should the adapter simulate success or failure? Default is "success" */
  simulateMode?: "success" | "failure";
  /** Simulate network latency (in milliseconds) */
  simulateLatencyMs?: number;
}

export class MockAdapter implements IPaymentProvider {
  readonly provider = "mock" as const;
  private config: MockAdapterConfig;

  constructor(config: MockAdapterConfig = { simulateMode: "success" }) {
    this.config = config;
  }

  private async delay(): Promise<void> {
    if (this.config.simulateLatencyMs) {
      await new Promise(resolve => setTimeout(resolve, this.config.simulateLatencyMs));
    }
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    await this.delay();
    if (input.amount <= 0) {
      throw new InvalidInputError("amount must be greater than 0.");
    }

    const transactionRef = `mock_${input.orderId}_${Date.now()}`;
    const paymentUrl = `https://mock.vn-payment.dev/checkout?orderId=${input.orderId}&amount=${input.amount}`;

    return {
      paymentUrl,
      transactionRef,
      raw: { input, simulated: true },
    };
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult> {
    await this.delay();
    const rawBody = input.rawBody as any;
    
    if (!rawBody || !rawBody.orderId) {
      throw new InvalidInputError("Mock Webhook requires an orderId");
    }

    const isSuccess = this.config.simulateMode === "success";

    return {
      isValid: true,
      status: isSuccess ? "success" : "failed",
      orderId: String(rawBody.orderId),
      transactionId: `txn_${Date.now()}`,
      amount: Number(rawBody.amount || 0),
      message: "Mock webhook verified",
      raw: rawBody,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    await this.delay();
    const isSuccess = this.config.simulateMode === "success";
    return {
      success: isSuccess,
      refundId: `ref_${Date.now()}`,
      message: "Mock refund",
      raw: { input },
    };
  }

  async queryTransaction(input: QueryTransactionInput): Promise<QueryTransactionResult> {
    await this.delay();
    const isSuccess = this.config.simulateMode === "success";
    return {
      status: isSuccess ? "success" : "failed",
      orderId: input.orderId,
      transactionId: input.transactionId || `txn_${Date.now()}`,
      amount: 0, // Mock doesn't remember amounts
      paidAt: isSuccess ? new Date() : undefined,
      raw: { input },
    };
  }
}
