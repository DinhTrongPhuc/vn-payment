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

export interface ZalopayConfig {
  appId: string;
  key1: string;
  key2: string;
  env?: "production" | "sandbox";
}

/**
 * ZaloPay adapter — implementation coming soon.
 * Follows IPaymentProvider so the interface is locked in.
 */
export class ZalopayAdapter implements IPaymentProvider {
  readonly provider = "zalopay" as const;

  constructor(_config: ZalopayConfig) {}

  async createOrder(_input: CreateOrderInput): Promise<CreateOrderResult> {
    throw new Error("ZalopayAdapter.createOrder() not yet implemented.");
  }

  async verifyWebhook(
    _input: VerifyWebhookInput
  ): Promise<VerifyWebhookResult> {
    throw new Error("ZalopayAdapter.verifyWebhook() not yet implemented.");
  }

  async refund(_input: RefundInput): Promise<RefundResult> {
    throw new Error("ZalopayAdapter.refund() not yet implemented.");
  }

  async queryTransaction(
    _input: QueryTransactionInput
  ): Promise<QueryTransactionResult> {
    throw new Error("ZalopayAdapter.queryTransaction() not yet implemented.");
  }
}
