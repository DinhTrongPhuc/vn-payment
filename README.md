# vn-payment

> Unified payment adapter for Vietnam payment gateways — MoMo, VNPay, ZaloPay.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## Why?

Integrating payment gateways in Vietnam means dealing with different signing algorithms, inconsistent callback formats, and no shared interface. `vn-payment` solves this by wrapping MoMo, VNPay, and ZaloPay behind a single, consistent API.

```ts
// Swap providers without rewriting your code
const payment = new MomoAdapter(config);
// const payment = new VnpayAdapter(config);
// const payment = new ZalopayAdapter(config);

const order = await payment.createOrder({ ... });
const result = await payment.verifyWebhook({ rawBody: req.body });
const refund  = await payment.refund({ ... });
```

## Packages

| Package               | Version | Description                             |
| --------------------- | ------- | --------------------------------------- |
| `@vn-payment/core`    | `0.1.0` | Shared types, interfaces, error classes |
| `@vn-payment/momo`    | `0.1.0` | MoMo adapter                            |
| `@vn-payment/vnpay`   | `0.1.0` | VNPay adapter _(coming soon)_           |
| `@vn-payment/zalopay` | `0.1.0` | ZaloPay adapter                         |

## Installation

```bash
# Install only the adapter you need
npm install @vn-payment/momo
```

## Quick start

```ts
import { MomoAdapter } from "@vn-payment/momo";

const momo = new MomoAdapter({
  partnerCode: process.env.MOMO_PARTNER_CODE,
  accessKey: process.env.MOMO_ACCESS_KEY,
  secretKey: process.env.MOMO_SECRET_KEY,
  env: "sandbox",
});

// Create order → get payment URL
const { paymentUrl } = await momo.createOrder({
  orderId: "ORDER_001",
  amount: 50000,
  description: "Thanh toán đơn hàng #001",
  redirectUrl: "https://yourapp.com/payment/return",
  ipnUrl: "https://yourapp.com/payment/webhook",
});

// Verify IPN callback
const result = await momo.verifyWebhook({ rawBody: req.body });
if (result.status === "success") {
  await markOrderAsPaid(result.orderId);
}
```

## Roadmap

- [x] `@vn-payment/core` — types & interfaces
- [x] `@vn-payment/momo` — MoMo adapter (HMAC-SHA256)
- [ ] `@vn-payment/vnpay` — VNPay adapter (HMAC-SHA512)
- [x] `@vn-payment/zalopay` — ZaloPay adapter (HMAC-SHA256)
- [ ] Test helpers & mock adapters
- [ ] Docs site

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
