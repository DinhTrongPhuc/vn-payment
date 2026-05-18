# Getting Started

`vn-payment` is a monorepo that provides a unified interface for multiple Vietnamese payment gateways.

## Installation

Install the core package and any specific adapters you need:

```bash
npm install @vn-payment/core
npm install @vn-payment/momo
npm install @vn-payment/vnpay
npm install @vn-payment/zalopay
```

## The IPaymentProvider Interface

Every adapter implements the `IPaymentProvider` interface, which means they all have the exact same methods:

- `createOrder(input)`: Generate a payment URL.
- `verifyWebhook(input)`: Parse and cryptographically verify an IPN callback.
- `refund(input)`: Issue a refund.
- `queryTransaction(input)`: Check transaction status.

## Example Usage

```ts
import { IPaymentProvider } from "@vn-payment/core";
import { MomoAdapter } from "@vn-payment/momo";

// Initialize adapter
const adapter: IPaymentProvider = new MomoAdapter({
  partnerCode: "...",
  accessKey: "...",
  secretKey: "...",
  env: "sandbox"
});

// Create Order
const order = await adapter.createOrder({
  orderId: "ORDER_123",
  amount: 50000,
  description: "Checkout",
  redirectUrl: "https://mysite.com/return",
  ipnUrl: "https://mysite.com/webhook",
});

console.log(order.paymentUrl);
```
