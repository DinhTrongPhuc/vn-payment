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

export interface VnpayConfig {
  tmnCode: string;
  secureSecret: string;
  env?: "production" | "sandbox";
}

/**
 * VNPay adapter — implementation coming soon.
 * Follows IPaymentProvider so the interface is locked in.
 */
export class VnpayAdapter implements IPaymentProvider {
  readonly provider = "vnpay" as const;

  constructor(_config: VnpayConfig) {}

  async createOrder(_input: CreateOrderInput): Promise<CreateOrderResult> {
    throw new Error("VnpayAdapter.createOrder() not yet implemented.");
  }

  async verifyWebhook(
    _input: VerifyWebhookInput
  ): Promise<VerifyWebhookResult> {
    throw new Error("VnpayAdapter.verifyWebhook() not yet implemented.");
  }

  async refund(_input: RefundInput): Promise<RefundResult> {
    throw new Error("VnpayAdapter.refund() not yet implemented.");
  }

  async queryTransaction(
    _input: QueryTransactionInput
  ): Promise<QueryTransactionResult> {
    throw new Error("VnpayAdapter.queryTransaction() not yet implemented.");
  }
}
