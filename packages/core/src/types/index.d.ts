export type PaymentProvider = "momo" | "vnpay" | "zalopay";
export interface CreateOrderInput {
    /** Unique order ID from your system */
    orderId: string;
    /** Amount in VND */
    amount: number;
    /** Short description shown to payer */
    description: string;
    /** URL to redirect after payment */
    redirectUrl: string;
    /** URL to receive async IPN/webhook callback */
    ipnUrl: string;
    /** Extra data passed through and returned in callback (optional) */
    extraData?: string;
}
export interface VerifyWebhookInput {
    /** Raw body from the provider's IPN/callback request */
    rawBody: Record<string, unknown>;
}
export interface RefundInput {
    /** The original orderId */
    orderId: string;
    /** Transaction ID returned by provider */
    transactionId: string;
    /** Amount to refund in VND (full or partial) */
    amount: number;
    /** Reason for refund */
    reason?: string;
}
export interface QueryTransactionInput {
    orderId: string;
    transactionId?: string;
}
export interface CreateOrderResult {
    /** Payment URL to redirect the user to */
    paymentUrl: string;
    /** Provider-specific transaction reference */
    transactionRef: string;
    /** Raw response from provider (for debugging) */
    raw: Record<string, unknown>;
}
export type PaymentStatus = "success" | "failed" | "pending" | "refunded" | "cancelled";
export interface VerifyWebhookResult {
    isValid: boolean;
    status: PaymentStatus;
    orderId: string;
    transactionId: string;
    amount: number;
    message: string;
    raw: Record<string, unknown>;
}
export interface RefundResult {
    success: boolean;
    refundId?: string;
    message: string;
    raw: Record<string, unknown>;
}
export interface QueryTransactionResult {
    status: PaymentStatus;
    orderId: string;
    transactionId: string;
    amount: number;
    paidAt?: Date;
    raw: Record<string, unknown>;
}
export interface IPaymentProvider {
    readonly provider: PaymentProvider;
    /**
     * Build a payment URL to redirect the user to the provider's checkout page.
     */
    createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
    /**
     * Verify and parse an IPN/webhook callback from the provider.
     * Returns a normalized result regardless of which provider sent the callback.
     */
    verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult>;
    /**
     * Issue a full or partial refund for a completed transaction.
     */
    refund(input: RefundInput): Promise<RefundResult>;
    /**
     * Query the current status of a transaction.
     */
    queryTransaction(input: QueryTransactionInput): Promise<QueryTransactionResult>;
}
//# sourceMappingURL=index.d.ts.map