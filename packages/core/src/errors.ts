export type VnPaymentErrorCode =
  | "INVALID_INPUT"
  | "INVALID_SIGNATURE"
  | "PROVIDER_ERROR"
  | "NETWORK_ERROR"
  | "UNSUPPORTED_OPERATION"
  | "UNKNOWN";

export class VnPaymentError extends Error {
  constructor(
    public readonly code: VnPaymentErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "VnPaymentError";
  }
}

export class InvalidSignatureError extends VnPaymentError {
  constructor(provider: string) {
    super(
      "INVALID_SIGNATURE",
      `[${provider}] Webhook signature verification failed. The request may have been tampered with.`
    );
    this.name = "InvalidSignatureError";
  }
}

export class InvalidInputError extends VnPaymentError {
  constructor(message: string) {
    super("INVALID_INPUT", message);
    this.name = "InvalidInputError";
  }
}

export class ProviderError extends VnPaymentError {
  constructor(provider: string, message: string, cause?: unknown) {
    super("PROVIDER_ERROR", `[${provider}] ${message}`, cause);
    this.name = "ProviderError";
  }
}
