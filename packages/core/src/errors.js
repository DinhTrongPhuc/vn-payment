export class VnPaymentError extends Error {
    constructor(code, message, cause) {
        super(message);
        this.code = code;
        this.cause = cause;
        this.name = "VnPaymentError";
    }
}
export class InvalidSignatureError extends VnPaymentError {
    constructor(provider) {
        super("INVALID_SIGNATURE", `[${provider}] Webhook signature verification failed. The request may have been tampered with.`);
        this.name = "InvalidSignatureError";
    }
}
export class InvalidInputError extends VnPaymentError {
    constructor(message) {
        super("INVALID_INPUT", message);
        this.name = "InvalidInputError";
    }
}
export class ProviderError extends VnPaymentError {
    constructor(provider, message, cause) {
        super("PROVIDER_ERROR", `[${provider}] ${message}`, cause);
        this.name = "ProviderError";
    }
}
//# sourceMappingURL=errors.js.map