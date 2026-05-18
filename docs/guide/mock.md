# Mock Adapter

The `@vn-payment/mock` adapter is a lifesaver for local development. Instead of hitting real payment gateway APIs, which is slow and requires internet connection, the Mock Adapter instantly simulates payment URLs and webhooks.

## Setup
You can dynamically swap your adapter depending on the environment.

```ts
import { IPaymentProvider } from "@vn-payment/core";
import { MomoAdapter } from "@vn-payment/momo";
import { MockAdapter } from "@vn-payment/mock";

const adapter: IPaymentProvider = process.env.NODE_ENV === "production"
  ? new MomoAdapter({ ... })
  : new MockAdapter({ simulateMode: "success" });

```

## Behavior

- **`createOrder`**: Returns a dummy URL `https://mock.vn-payment.dev/checkout...`.
- **`verifyWebhook`**: Expects `{ orderId: "..." }` and instantly returns success (if `simulateMode` is "success").
- **`refund` / `queryTransaction`**: Returns success instantly.

You can set `simulateMode: "failure"` if you want to test how your system handles failed payments!
