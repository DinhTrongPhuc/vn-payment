# ZaloPay

The ZaloPay adapter uses HMAC-SHA256 for secure signature generation. ZaloPay requires two separate keys (`key1` for creating requests, `key2` for verifying callbacks).

## Setup
```ts
import { ZalopayAdapter } from "@vn-payment/zalopay";

const adapter = new ZalopayAdapter({
  appId: process.env.ZALOPAY_APP_ID!,
  key1: process.env.ZALOPAY_KEY1!,
  key2: process.env.ZALOPAY_KEY2!,
  env: "sandbox", 
});
```

## Webhook Handling
ZaloPay sends POST requests to your `ipnUrl`.

```ts
app.post("/payment/webhook", async (req, res) => {
  try {
    const result = await adapter.verifyWebhook({ rawBody: req.body });
    
    if (result.status === "success") {
      // mark order paid
    }
    
    // ZaloPay strictly requires this JSON payload to acknowledge receipt
    res.json({ return_code: 1, return_message: "success" });
  } catch (err) {
    // Handle InvalidSignatureError
  }
});
```
