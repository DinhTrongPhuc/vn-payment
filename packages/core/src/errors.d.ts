export type VnPaymentErrorCode = "INVALID_INPUT" | "INVALID_SIGNATURE" | "PROVIDER_ERROR" | "NETWORK_ERROR" | "UNSUPPORTED_OPERATION" | "UNKNOWN";
export declare class VnPaymentError extends Error {
    readonly code: VnPaymentErrorCode;
    readonly cause?: unknown | undefined;
    constructor(code: VnPaymentErrorCode, message: string, cause?: unknown | undefined);
}
export declare class InvalidSignatureError extends VnPaymentError {
    constructor(provider: string);
}
export declare class InvalidInputError extends VnPaymentError {
    constructor(message: string);
}
export declare class ProviderError extends VnPaymentError {
    constructor(provider: string, message: string, cause?: unknown);
}
//# sourceMappingURL=errors.d.ts.map