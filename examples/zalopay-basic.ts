/**
 * Example: how a developer uses @vn-payment/zalopay in their project.
 *
 * Install:
 *   npm install @vn-payment/zalopay
 *
 * Every adapter shares the same interface — swap ZalopayAdapter
 * with MomoAdapter or VnpayAdapter without changing any other code.
 */

import { ZalopayAdapter } from "@vn-payment/zalopay";

const zalopay = new ZalopayAdapter({
    appId: process.env.ZALOPAY_APP_ID!,
    key1: process.env.ZALOPAY_KEY1!,
    key2: process.env.ZALOPAY_KEY2!,
    env: "sandbox",
});

// 1. Create a payment order
const order = await zalopay.createOrder({
    orderId: "ORDER_001",
    amount: 50000,
    description: "Thanh toán đơn hàng #001",
    redirectUrl: "https://yourapp.com/payment/return",
    ipnUrl: "https://yourapp.com/payment/webhook",
});

console.log("Redirect user to:", order.paymentUrl);

// 2. Verify IPN callback (in your webhook handler)
// app.post("/payment/webhook", async (req, res) => {
//   const result = await zalopay.verifyWebhook({ rawBody: req.body });
//   
//   if (result.status === "success") {
//     await markOrderAsPaid(result.orderId);
//   }
//   
//   // ZaloPay requires a specific JSON response for webhook
//   res.json({ return_code: 1, return_message: "success" });
// });

// 3. Refund
// const refund = await zalopay.refund({
//   orderId: "ORDER_001",
//   transactionId: "TXN_12345",
//   amount: 50000,
//   reason: "Khách hàng đổi ý",
// });
