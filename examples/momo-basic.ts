/**
 * Example: how a developer uses @vn-payment/* in their project.
 *
 * Install:
 *   npm install @vn-payment/momo
 *
 * Every adapter shares the same interface — swap MomoAdapter
 * with VnpayAdapter or ZalopayAdapter without changing any other code.
 */

import { MomoAdapter } from "@vn-payment/momo";

const momo = new MomoAdapter({
    partnerCode: process.env.MOMO_PARTNER_CODE!,
    accessKey: process.env.MOMO_ACCESS_KEY!,
    secretKey: process.env.MOMO_SECRET_KEY!,
    env: "sandbox",
});

// 1. Create a payment order
const order = await momo.createOrder({
    orderId: "ORDER_001",
    amount: 50000,
    description: "Thanh toán đơn hàng #001",
    redirectUrl: "https://yourapp.com/payment/return",
    ipnUrl: "https://yourapp.com/payment/webhook",
});

console.log("Redirect user to:", order.paymentUrl);

// 2. Verify IPN callback (in your webhook handler)
// app.post("/payment/webhook", async (req, res) => {
//   const result = await momo.verifyWebhook({ rawBody: req.body });
//   if (result.status === "success") {
//     await markOrderAsPaid(result.orderId);
//   }
//   res.sendStatus(204);
// });

// 3. Refund
// const refund = await momo.refund({
//   orderId: "ORDER_001",
//   transactionId: "TXN_12345",
//   amount: 50000,
//   reason: "Khách hàng đổi ý",
// });
