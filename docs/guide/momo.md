# MoMo

The MoMo adapter uses HMAC-SHA256 for secure signature generation.

## Setup
```ts
import { MomoAdapter } from "@vn-payment/momo";

const adapter = new MomoAdapter({
  partnerCode: process.env.MOMO_PARTNER_CODE!,
  accessKey: process.env.MOMO_ACCESS_KEY!,
  secretKey: process.env.MOMO_SECRET_KEY!,
  env: "sandbox", // or "production"
});
```

## Webhook Handling
MoMo sends POST requests to your `ipnUrl`. You must pass the raw body to the `verifyWebhook` method.

```ts
app.post("/payment/webhook", async (req, res) => {
  try {
    const result = await adapter.verifyWebhook({ rawBody: req.body });
    if (result.status === "success") {
      // mark order paid
    }
    res.sendStatus(204);
  } catch (err) {
    // Handle InvalidSignatureError
  }
});
```
