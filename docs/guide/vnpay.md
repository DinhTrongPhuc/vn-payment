# VNPay

The VNPay adapter uses HMAC-SHA512 for secure signature generation and requires parameters to be alphabetically sorted.

## Setup
```ts
import { VnpayAdapter } from "@vn-payment/vnpay";

const adapter = new VnpayAdapter({
  tmnCode: process.env.VNPAY_TMN_CODE!,
  secureSecret: process.env.VNPAY_SECURE_SECRET!,
  env: "sandbox", 
});
```

## Webhook Handling
Unlike MoMo which sends a POST request, VNPay typically redirects the user or sends IPN via GET query string parameters.

```ts
app.get("/payment/webhook", async (req, res) => {
  try {
    const result = await adapter.verifyWebhook({ rawBody: req.query });
    
    if (result.status === "success") {
      // mark order paid
    }
    
    // VNPay strictly requires this JSON payload to acknowledge receipt
    res.json({ RspCode: "00", Message: "Confirm Success" });
  } catch (err) {
    // Handle InvalidSignatureError
  }
});
```
